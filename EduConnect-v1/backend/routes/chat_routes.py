"""
chat_routes.py — WhatsApp-style Chat Backend
POST   /api/chat/conversations
GET    /api/chat/conversations
GET    /api/chat/conversations/{chat_id}
DELETE /api/chat/conversations/{chat_id}
GET    /api/chat/conversations/{chat_id}/messages
POST   /api/chat/conversations/{chat_id}/messages
DELETE /api/chat/conversations/{chat_id}/messages/{msg_id}
PUT    /api/chat/conversations/{chat_id}/read
POST   /api/chat/conversations/{chat_id}/members     ← group: add member
DELETE /api/chat/conversations/{chat_id}/members/{user_id}  ← remove
GET    /api/chat/unread-count
"""

import os
import shutil
from datetime import datetime, timezone
from typing import Optional, List

from fastapi import (
    APIRouter, Depends, HTTPException,
    UploadFile, File, Form
)
from pydantic import BaseModel
from sqlalchemy.orm import Session
from sqlalchemy import desc, and_, or_, func

from database import get_db
from auth import get_current_user, create_notification
import models

router = APIRouter()
UPLOAD_DIR = os.getenv("UPLOAD_DIR", "uploads")


# ══════════════════════════════════════════════════════════
# SCHEMAS
# ══════════════════════════════════════════════════════════

class CreateDMRequest(BaseModel):
    user_id: str          # The other person


class CreateGroupRequest(BaseModel):
    name: str
    member_ids: List[str]


class SendMessageRequest(BaseModel):
    content: Optional[str] = None


class AddMemberRequest(BaseModel):
    user_id: str


# ══════════════════════════════════════════════════════════
# SERIALIZERS
# ══════════════════════════════════════════════════════════

def serialize_message(m: models.Message, current_user: models.User) -> dict:
    return {
        "id": m.id,
        "chat_id": m.chat_id,
        "content": m.content,
        "media_url": m.media_url,
        "media_type": m.media_type,
        "is_read": m.is_read,
        "created_at": m.created_at.isoformat(),
        "is_mine": m.sender_id == current_user.id,
        "sender": {
            "id": m.sender.id,
            "name": m.sender.name,
            "username": m.sender.username,
            "avatar_url": m.sender.avatar_url,
            "study_status": m.sender.study_status,
        },
    }


def serialize_chat(
    chat: models.Chat,
    current_user: models.User,
    db: Session,
) -> dict:
    # Last message
    last_msg = (
        db.query(models.Message)
        .filter(models.Message.chat_id == chat.id)
        .order_by(desc(models.Message.created_at))
        .first()
    )

    # Unread count for current user
    unread = (
        db.query(func.count(models.Message.id))
        .filter(
            models.Message.chat_id == chat.id,
            models.Message.sender_id != current_user.id,
            models.Message.is_read == False,
        )
        .scalar()
    )

    # For DMs: the "other" participant
    other = None
    if not chat.is_group:
        others = [p for p in chat.participants if p.id != current_user.id]
        if others:
            other = {
                "id": others[0].id,
                "name": others[0].name,
                "username": others[0].username,
                "avatar_url": others[0].avatar_url,
                "study_status": others[0].study_status,
                "exam_target": others[0].exam_target,
            }

    return {
        "id": chat.id,
        "name": chat.name if chat.is_group else (other["name"] if other else "Unknown"),
        "is_group": chat.is_group,
        "avatar_url": chat.avatar_url if chat.is_group else (other["avatar_url"] if other else None),
        "created_at": chat.created_at.isoformat(),
        "participants": [
            {
                "id": p.id,
                "name": p.name,
                "username": p.username,
                "avatar_url": p.avatar_url,
                "study_status": p.study_status,
            }
            for p in chat.participants
        ],
        "other_user": other,
        "last_message": serialize_message(last_msg, current_user) if last_msg else None,
        "unread_count": unread or 0,
        "members_count": len(chat.participants),
    }


# ══════════════════════════════════════════════════════════
# CONVERSATIONS
# ══════════════════════════════════════════════════════════

@router.post("/conversations", status_code=201)
def create_or_get_dm(
    req: CreateDMRequest,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    """
    Create a DM conversation with another user.
    If one already exists between these two users, returns it.
    """
    if req.user_id == current_user.id:
        raise HTTPException(status_code=400, detail="Cannot start a chat with yourself.")

    other = db.query(models.User).filter(models.User.id == req.user_id).first()
    if not other:
        raise HTTPException(status_code=404, detail="User not found.")

    # Check if DM already exists
    existing = (
        db.query(models.Chat)
        .filter(models.Chat.is_group == False)
        .filter(models.Chat.participants.any(models.User.id == current_user.id))
        .filter(models.Chat.participants.any(models.User.id == req.user_id))
        .first()
    )
    if existing:
        return serialize_chat(existing, current_user, db)

    # Create new DM
    chat = models.Chat(
        is_group=False,
        created_by=current_user.id,
    )
    db.add(chat)
    db.flush()
    chat.participants.append(current_user)
    chat.participants.append(other)

    db.commit()
    db.refresh(chat)
    return serialize_chat(chat, current_user, db)


@router.post("/conversations/group", status_code=201)
def create_group(
    req: CreateGroupRequest,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    if not req.name.strip():
        raise HTTPException(status_code=400, detail="Group name is required.")
    if len(req.member_ids) < 1:
        raise HTTPException(status_code=400, detail="Add at least one other member.")

    chat = models.Chat(
        name=req.name.strip(),
        is_group=True,
        created_by=current_user.id,
    )
    db.add(chat)
    db.flush()
    chat.participants.append(current_user)

    for uid in req.member_ids:
        user = db.query(models.User).filter(models.User.id == uid).first()
        if user and user not in chat.participants:
            chat.participants.append(user)

    db.commit()
    db.refresh(chat)

    # Send a system message
    system_msg = models.Message(
        chat_id=chat.id,
        sender_id=current_user.id,
        content=f"{current_user.name} created the group \"{chat.name}\"",
    )
    db.add(system_msg)
    db.commit()

    return serialize_chat(chat, current_user, db)


@router.get("/conversations")
def list_conversations(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    """
    Returns all chats for the current user,
    sorted by most recent message.
    """
    chats = (
        db.query(models.Chat)
        .filter(models.Chat.participants.any(models.User.id == current_user.id))
        .all()
    )

    serialized = [serialize_chat(c, current_user, db) for c in chats]

    # Sort by last message timestamp (most recent first)
    serialized.sort(
        key=lambda c: c["last_message"]["created_at"] if c["last_message"] else "0",
        reverse=True,
    )
    return serialized


@router.get("/conversations/{chat_id}")
def get_conversation(
    chat_id: str,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    chat = _get_chat_or_403(chat_id, current_user, db)
    return serialize_chat(chat, current_user, db)


@router.delete("/conversations/{chat_id}")
def delete_conversation(
    chat_id: str,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    chat = _get_chat_or_403(chat_id, current_user, db)

    if chat.is_group and chat.created_by != current_user.id and current_user.role != "admin":
        raise HTTPException(status_code=403, detail="Only the group creator can delete it.")

    db.delete(chat)
    db.commit()
    return {"message": "Conversation deleted."}


# ── GROUP MEMBERS ─────────────────────────────────────────

@router.post("/conversations/{chat_id}/members", status_code=201)
def add_member(
    chat_id: str,
    req: AddMemberRequest,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    chat = _get_chat_or_403(chat_id, current_user, db)
    if not chat.is_group:
        raise HTTPException(status_code=400, detail="Cannot add members to a DM.")

    user = db.query(models.User).filter(models.User.id == req.user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found.")
    if user in chat.participants:
        raise HTTPException(status_code=400, detail="User already in group.")

    chat.participants.append(user)

    # System message
    msg = models.Message(
        chat_id=chat.id,
        sender_id=current_user.id,
        content=f"{current_user.name} added {user.name} to the group.",
    )
    db.add(msg)
    db.commit()
    return {"message": f"{user.name} added to group."}


@router.delete("/conversations/{chat_id}/members/{user_id}")
def remove_member(
    chat_id: str,
    user_id: str,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    chat = _get_chat_or_403(chat_id, current_user, db)
    if not chat.is_group:
        raise HTTPException(status_code=400, detail="Cannot remove members from a DM.")

    # Allow self-removal or creator removing others
    if user_id != current_user.id and chat.created_by != current_user.id:
        raise HTTPException(status_code=403, detail="Only the group creator can remove members.")

    user = db.query(models.User).filter(models.User.id == user_id).first()
    if not user or user not in chat.participants:
        raise HTTPException(status_code=404, detail="Member not found in group.")

    chat.participants.remove(user)

    msg = models.Message(
        chat_id=chat.id,
        sender_id=current_user.id,
        content=(
            f"{current_user.name} left the group."
            if user_id == current_user.id
            else f"{current_user.name} removed {user.name}."
        ),
    )
    db.add(msg)
    db.commit()
    return {"message": "Member removed."}


# ══════════════════════════════════════════════════════════
# MESSAGES
# ══════════════════════════════════════════════════════════

@router.get("/conversations/{chat_id}/messages")
def get_messages(
    chat_id: str,
    page: int = 1,
    limit: int = 40,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    chat = _get_chat_or_403(chat_id, current_user, db)

    total = (
        db.query(func.count(models.Message.id))
        .filter(models.Message.chat_id == chat_id)
        .scalar()
    )

    messages = (
        db.query(models.Message)
        .filter(models.Message.chat_id == chat_id)
        .order_by(desc(models.Message.created_at))
        .offset((page - 1) * limit)
        .limit(limit)
        .all()
    )

    # Return in chronological order (oldest first for display)
    messages.reverse()

    return {
        "messages": [serialize_message(m, current_user) for m in messages],
        "total": total,
        "page": page,
        "pages": (total + limit - 1) // limit,
        "has_more": total > page * limit,
    }


@router.post("/conversations/{chat_id}/messages", status_code=201)
async def send_message(
    chat_id: str,
    content: Optional[str] = Form(None),
    file: Optional[UploadFile] = File(None),
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    chat = _get_chat_or_403(chat_id, current_user, db)

    if not content and not file:
        raise HTTPException(status_code=400, detail="Message must have content or a file.")

    media_url = None
    media_type = None

    if file and file.filename:
        ext = os.path.splitext(file.filename)[-1].lower()
        fname = f"{current_user.id}_{datetime.now().timestamp()}{ext}"

        # Determine type
        if ext in (".jpg", ".jpeg", ".png", ".gif", ".webp"):
            media_type = "image"
            subdir = "posts"
        elif ext in (".mp4", ".mov", ".webm"):
            media_type = "video"
            subdir = "posts"
        else:
            media_type = "file"
            subdir = "resources"

        path = os.path.join(UPLOAD_DIR, subdir, fname)
        with open(path, "wb") as out:
            shutil.copyfileobj(file.file, out)
        media_url = f"/uploads/{subdir}/{fname}"

    msg = models.Message(
        chat_id=chat_id,
        sender_id=current_user.id,
        content=content,
        media_url=media_url,
        media_type=media_type,
    )
    db.add(msg)
    db.commit()
    db.refresh(msg)

    # Notify other participants (for DMs)
    if not chat.is_group:
        for p in chat.participants:
            if p.id != current_user.id:
                create_notification(
                    db, p.id, "message",
                    f"New message from {current_user.name}",
                    link=f"/chat/{chat_id}",
                )
        db.commit()

    return serialize_message(msg, current_user)


@router.delete("/conversations/{chat_id}/messages/{msg_id}")
def delete_message(
    chat_id: str,
    msg_id: str,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    msg = db.query(models.Message).filter(
        models.Message.id == msg_id,
        models.Message.chat_id == chat_id,
    ).first()
    if not msg:
        raise HTTPException(status_code=404, detail="Message not found.")
    if msg.sender_id != current_user.id:
        raise HTTPException(status_code=403, detail="Cannot delete someone else's message.")

    db.delete(msg)
    db.commit()
    return {"message": "Message deleted."}


# ── MARK AS READ ──────────────────────────────────────────

@router.put("/conversations/{chat_id}/read")
def mark_read(
    chat_id: str,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    _get_chat_or_403(chat_id, current_user, db)

    db.query(models.Message).filter(
        models.Message.chat_id == chat_id,
        models.Message.sender_id != current_user.id,
        models.Message.is_read == False,
    ).update({"is_read": True})
    db.commit()
    return {"message": "Messages marked as read."}


# ── UNREAD COUNT ──────────────────────────────────────────

@router.get("/unread-count")
def get_unread_count(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    """Total unread messages across all conversations."""
    # Get all chat IDs for this user
    chat_ids = [c.id for c in current_user.chats]

    if not chat_ids:
        return {"unread_count": 0}

    count = (
        db.query(func.count(models.Message.id))
        .filter(
            models.Message.chat_id.in_(chat_ids),
            models.Message.sender_id != current_user.id,
            models.Message.is_read == False,
        )
        .scalar()
    )
    return {"unread_count": count or 0}


# ══════════════════════════════════════════════════════════
# INTERNAL HELPERS
# ══════════════════════════════════════════════════════════

def _get_chat_or_403(
    chat_id: str,
    current_user: models.User,
    db: Session,
) -> models.Chat:
    """Fetch chat and verify current user is a participant."""
    chat = db.query(models.Chat).filter(models.Chat.id == chat_id).first()
    if not chat:
        raise HTTPException(status_code=404, detail="Conversation not found.")
    if current_user not in chat.participants:
        raise HTTPException(status_code=403, detail="You are not in this conversation.")
    return chat
