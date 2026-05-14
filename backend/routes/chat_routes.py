"""chat_routes.py - Chat, group messaging, and conversation utilities."""

import os
import uuid
from datetime import datetime, timezone
from typing import List, Optional

from fastapi import APIRouter, Depends, File, Form, HTTPException, Request, UploadFile
from fastapi.responses import JSONResponse
from pydantic import BaseModel

import database as db
from auth import get_current_user

router = APIRouter()

IMAGE_EXTENSIONS = {".jpg", ".jpeg", ".png", ".webp", ".gif"}


def _now() -> str:
    return datetime.now(timezone.utc).isoformat()


def _viewer_context(user_id: str) -> dict:
    return db.find_one("users", id=user_id) or {
        "id": user_id,
        "name": "Unknown",
        "username": "unknown",
    }


def _fmt_user(user: Optional[dict]) -> Optional[dict]:
    if not user:
        return None
    return {
        "id": user["id"],
        "name": user["name"],
        "username": user["username"],
        "avatar_url": user.get("avatar_url"),
    }


def _fmt_msg(message: Optional[dict], current_user: dict) -> Optional[dict]:
    if not message:
        return None
    sender = db.find_one("users", id=message["sender_id"]) or {}
    return {
        **message,
        "is_mine": message["sender_id"] == current_user["id"],
        "sender": _fmt_user(sender),
    }


def _serialize_conv(conv: dict, current_user: dict) -> dict:
    messages = sorted(
        db.find_many("messages", chat_id=conv["id"]),
        key=lambda item: item["created_at"],
    )
    last_message = messages[-1] if messages else None
    unread_count = len(
        [
            item
            for item in messages
            if item.get("sender_id") != current_user["id"] and not item.get("is_read")
        ]
    )
    participant_ids = conv.get("participant_ids", [])
    is_pinned = bool(
        db.find_one("chat_pins", user_id=current_user["id"], chat_id=conv["id"])
    )
    is_muted = bool(
        db.find_one("chat_mutes", user_id=current_user["id"], chat_id=conv["id"])
    )

    base = {
        **conv,
        "last_message": _fmt_msg(last_message, current_user) if last_message else None,
        "unread_count": unread_count,
        "members_count": len(participant_ids),
        "is_pinned": is_pinned,
        "is_muted": is_muted,
    }

    if conv.get("is_group"):
        return base

    other_id = next(
        (participant_id for participant_id in participant_ids if participant_id != current_user["id"]),
        None,
    )
    other_user = db.find_one("users", id=other_id) if other_id else None
    return {
        **base,
        "other_user": _fmt_user(other_user),
        "name": other_user["name"] if other_user else "Unknown",
    }


def _conversation_sort_key(conv: dict):
    raw_value = (
        conv.get("last_message", {}).get("created_at")
        or conv.get("updated_at")
        or conv.get("created_at")
        or ""
    )
    try:
        timestamp = datetime.fromisoformat(raw_value.replace("Z", "+00:00")).timestamp()
    except ValueError:
        timestamp = 0

    return (
        0 if conv.get("is_pinned") else 1,
        -timestamp,
    )


def _get_conversation_for_user(chat_id: str, current_user: dict) -> dict:
    conv = db.find_one("conversations", id=chat_id)
    if not conv:
        raise HTTPException(404, "Conversation not found.")
    if current_user["id"] not in conv.get("participant_ids", []):
        raise HTTPException(403, "You are not a member of this conversation.")
    return conv


def _get_group_for_owner(chat_id: str, current_user: dict) -> dict:
    conv = db.find_one("conversations", id=chat_id)
    if not conv or not conv.get("is_group"):
        raise HTTPException(404, "Group conversation not found.")
    if current_user["id"] not in conv.get("participant_ids", []):
        raise HTTPException(403, "You are not a member of this group.")
    if conv.get("created_by") != current_user["id"]:
        raise HTTPException(403, "Only the group creator can manage members.")
    return conv


def _create_message(
    chat_id: str,
    sender_id: str,
    *,
    content: Optional[str] = None,
    media_url: Optional[str] = None,
    media_type: Optional[str] = None,
    system: bool = False,
) -> dict:
    created_at = _now()
    message = {
        "id": uuid.uuid4().hex,
        "chat_id": chat_id,
        "sender_id": sender_id,
        "content": content.strip() if content else None,
        "media_url": media_url,
        "media_type": media_type,
        "is_read": False,
        "system": system,
        "created_at": created_at,
    }
    db.insert("messages", message)
    db.update_one("conversations", chat_id, {"updated_at": created_at})
    return message


def _manager(request: Request):
    return getattr(request.app.state, "manager", None)


async def _send_event_to_users(manager, user_ids: List[str], payload: dict, exclude: Optional[str] = None):
    if manager is None or not user_ids:
        return
    await manager.send_to_users(user_ids, payload, exclude=exclude)


async def _broadcast_chat_message(manager, conv: dict, message: dict, exclude: Optional[str] = None):
    if manager is None:
        return

    for participant_id in conv.get("participant_ids", []):
        if exclude and participant_id == exclude:
            continue
        viewer = _viewer_context(participant_id)
        await manager.send_to_user(
            participant_id,
            {
                "type": "chat_message",
                "chat_id": conv["id"],
                **_fmt_msg(message, viewer),
                "conversation": _serialize_conv(conv, viewer),
            },
        )


async def _broadcast_conversation_state(manager, conv: dict, exclude: Optional[str] = None):
    if manager is None:
        return

    for participant_id in conv.get("participant_ids", []):
        if exclude and participant_id == exclude:
            continue
        viewer = _viewer_context(participant_id)
        await manager.send_to_user(
            participant_id,
            {
                "type": "conversation_updated",
                "chat_id": conv["id"],
                "conversation": _serialize_conv(conv, viewer),
            },
        )


def _message_media_type(filename: str) -> str:
    ext = os.path.splitext(filename)[-1].lower()
    return "image" if ext in IMAGE_EXTENSIONS else "file"


@router.get("/conversations")
def get_conversations(current_user: dict = Depends(get_current_user)):
    try:
        print(f"[GET /conversations] Loading for user {current_user.get('id')}")
        mine = [
            conv
            for conv in db.find_all("conversations")
            if current_user["id"] in conv.get("participant_ids", [])
        ]
        print(f"[GET /conversations] Found {len(mine)} conversations")
        
        serialized = []
        for conv in mine:
            try:
                serialized.append(_serialize_conv(conv, current_user))
            except Exception as e:
                print(f"[GET /conversations] Error serializing conversation {conv.get('id')}: {e}")
                import traceback
                traceback.print_exc()
                continue
        
        print(f"[GET /conversations] Serialized {len(serialized)} conversations")
        
        try:
            serialized.sort(key=_conversation_sort_key)
        except Exception as e:
            print(f"[GET /conversations] Error sorting conversations: {e}")
            import traceback
            traceback.print_exc()
        
        print(f"[GET /conversations] Returning {len(serialized)} conversations")
        return serialized
    except Exception as e:
        print(f"[GET /conversations] Fatal error: {e}")
        import traceback
        traceback.print_exc()
        return JSONResponse(
            status_code=500,
            content={"detail": f"Failed to load conversations: {str(e)}"}
        )


@router.get("/conversations/{chat_id}")
def get_conversation(chat_id: str, current_user: dict = Depends(get_current_user)):
    conv = _get_conversation_for_user(chat_id, current_user)
    participants = [
        _fmt_user(db.find_one("users", id=participant_id))
        for participant_id in conv.get("participant_ids", [])
    ]
    return {
        **_serialize_conv(conv, current_user),
        "participants": [participant for participant in participants if participant],
    }


@router.post("/dm/{user_id}")
def create_dm(user_id: str, current_user: dict = Depends(get_current_user)):
    if user_id == current_user["id"]:
        raise HTTPException(400, "Cannot DM yourself.")

    other = db.find_one("users", id=user_id)
    if not other:
        raise HTTPException(404, "User not found.")

    for conv in db.find_all("conversations"):
        if not conv.get("is_group") and set(conv.get("participant_ids", [])) == {
            current_user["id"],
            user_id,
        }:
            return _serialize_conv(conv, current_user)

    conv = {
        "id": uuid.uuid4().hex,
        "is_group": False,
        "name": other["name"],
        "participant_ids": [current_user["id"], user_id],
        "created_by": current_user["id"],
        "created_at": _now(),
        "updated_at": _now(),
    }
    db.insert("conversations", conv)
    return _serialize_conv(conv, current_user)


class GroupCreate(BaseModel):
    name: str
    member_ids: List[str]


@router.post("/group")
async def create_group(
    req: GroupCreate,
    request: Request,
    current_user: dict = Depends(get_current_user),
):
    if not req.name.strip():
        raise HTTPException(400, "Group name required.")

    member_ids: List[str] = []
    for member_id in req.member_ids:
        if member_id == current_user["id"] or member_id in member_ids:
            continue
        if not db.find_one("users", id=member_id):
            raise HTTPException(404, f"User not found: {member_id}")
        member_ids.append(member_id)

    conv = {
        "id": uuid.uuid4().hex,
        "is_group": True,
        "name": req.name.strip(),
        "participant_ids": [current_user["id"], *member_ids],
        "created_by": current_user["id"],
        "created_at": _now(),
        "updated_at": _now(),
    }
    db.insert("conversations", conv)

    created_msg = _create_message(
        conv["id"],
        current_user["id"],
        content=f"{current_user['name']} created the group.",
        system=True,
    )

    manager = _manager(request)
    await _broadcast_chat_message(manager, conv, created_msg, exclude=current_user["id"])
    await _broadcast_conversation_state(manager, conv, exclude=current_user["id"])

    return _serialize_conv(conv, current_user)


@router.post("/conversations/{chat_id}/members/{user_id}")
async def add_member(
    chat_id: str,
    user_id: str,
    request: Request,
    current_user: dict = Depends(get_current_user),
):
    conv = _get_group_for_owner(chat_id, current_user)
    target_user = db.find_one("users", id=user_id)
    if not target_user:
        raise HTTPException(404, "User not found.")

    participant_ids = list(conv.get("participant_ids", []))
    if user_id in participant_ids:
        return {
            "message": "Member already exists.",
            "participant": _fmt_user(target_user),
            "conversation": _serialize_conv(conv, current_user),
        }

    participant_ids.append(user_id)
    updated_at = _now()
    updated_conv = db.update_one(
        "conversations",
        chat_id,
        {"participant_ids": participant_ids, "updated_at": updated_at},
    ) or {**conv, "participant_ids": participant_ids, "updated_at": updated_at}

    system_msg = _create_message(
        chat_id,
        current_user["id"],
        content=f"{current_user['name']} added {target_user['name']} to the group.",
        system=True,
    )

    manager = _manager(request)
    await _broadcast_chat_message(manager, updated_conv, system_msg, exclude=current_user["id"])
    await _send_event_to_users(
        manager,
        participant_ids,
        {
            "type": "chat_member_added",
            "chat_id": chat_id,
            "added_user": _fmt_user(target_user),
            "by_user": _fmt_user(current_user),
        },
        exclude=current_user["id"],
    )
    await _broadcast_conversation_state(manager, updated_conv, exclude=current_user["id"])

    return {
        "message": "Member added.",
        "participant": _fmt_user(target_user),
        "conversation": _serialize_conv(updated_conv, current_user),
    }


@router.delete("/conversations/{chat_id}/members/{user_id}")
async def remove_member(
    chat_id: str,
    user_id: str,
    request: Request,
    current_user: dict = Depends(get_current_user),
):
    conv = _get_group_for_owner(chat_id, current_user)
    participant_ids = list(conv.get("participant_ids", []))

    if user_id == conv.get("created_by"):
        raise HTTPException(400, "The group creator cannot be removed.")
    if user_id not in participant_ids:
        raise HTTPException(404, "Member not found in this group.")

    removed_user = _viewer_context(user_id)
    remaining_ids = [participant_id for participant_id in participant_ids if participant_id != user_id]
    updated_at = _now()
    updated_conv = db.update_one(
        "conversations",
        chat_id,
        {"participant_ids": remaining_ids, "updated_at": updated_at},
    ) or {**conv, "participant_ids": remaining_ids, "updated_at": updated_at}

    system_msg = _create_message(
        chat_id,
        current_user["id"],
        content=f"{current_user['name']} removed {removed_user['name']} from the group.",
        system=True,
    )

    manager = _manager(request)
    await _broadcast_chat_message(manager, updated_conv, system_msg, exclude=current_user["id"])
    await _send_event_to_users(
        manager,
        remaining_ids,
        {
            "type": "chat_member_removed",
            "chat_id": chat_id,
            "removed_user_id": user_id,
            "removed_user": _fmt_user(removed_user),
            "by_user": _fmt_user(current_user),
        },
        exclude=current_user["id"],
    )
    if manager is not None:
        await manager.send_to_user(
            user_id,
            {
                "type": "conversation_removed",
                "chat_id": chat_id,
                "removed_by": _fmt_user(current_user),
            },
        )
    await _broadcast_conversation_state(manager, updated_conv, exclude=current_user["id"])

    return {
        "message": "Member removed.",
        "removed_user_id": user_id,
        "conversation": _serialize_conv(updated_conv, current_user),
    }


@router.get("/conversations/{chat_id}/messages")
def get_messages(
    chat_id: str,
    page: int = 1,
    limit: int = 40,
    current_user: dict = Depends(get_current_user),
):
    conv = _get_conversation_for_user(chat_id, current_user)
    messages = sorted(
        db.find_many("messages", chat_id=conv["id"]),
        key=lambda item: item["created_at"],
        reverse=True,
    )
    total = len(messages)
    page_messages = list(reversed(messages[(page - 1) * limit : page * limit]))
    return {
        "messages": [_fmt_msg(message, current_user) for message in page_messages],
        "total": total,
        "has_more": page * limit < total,
    }


@router.post("/conversations/{chat_id}/messages", status_code=201)
async def send_message(
    chat_id: str,
    request: Request,
    content: str = Form(""),
    file: Optional[UploadFile] = File(None),
    current_user: dict = Depends(get_current_user),
):
    conv = _get_conversation_for_user(chat_id, current_user)

    media_url = None
    media_type = None
    if file and file.filename:
        filename = file.filename
        from cloudinary_utils import upload_file as cloudinary_upload
        media_type = _message_media_type(file.filename)
        media_url = await cloudinary_upload(file, folder="chat")

    if not content.strip() and not media_url:
        raise HTTPException(400, "Message cannot be empty.")

    message = _create_message(
        chat_id,
        current_user["id"],
        content=content,
        media_url=media_url,
        media_type=media_type,
    )
    updated_conv = db.find_one("conversations", id=chat_id) or conv

    manager = _manager(request)
    await _broadcast_chat_message(manager, updated_conv, message, exclude=current_user["id"])
    await _broadcast_conversation_state(manager, updated_conv, exclude=current_user["id"])

    return _fmt_msg(message, current_user)


@router.delete("/conversations/{chat_id}/messages/{msg_id}")
async def delete_message(
    chat_id: str,
    msg_id: str,
    request: Request,
    current_user: dict = Depends(get_current_user),
):
    conv = _get_conversation_for_user(chat_id, current_user)
    message = db.find_one("messages", id=msg_id, chat_id=chat_id)
    if not message:
        raise HTTPException(404, "Message not found.")
    if message["sender_id"] != current_user["id"]:
        raise HTTPException(403, "You can only delete your own messages.")

    db.delete_one("messages", msg_id)

    manager = _manager(request)
    await _send_event_to_users(
        manager,
        conv.get("participant_ids", []),
        {
            "type": "message_deleted",
            "chat_id": chat_id,
            "message_id": msg_id,
        },
        exclude=current_user["id"],
    )
    refreshed_conv = db.find_one("conversations", id=chat_id) or conv
    await _broadcast_conversation_state(manager, refreshed_conv, exclude=current_user["id"])

    return {"message": "Deleted.", "message_id": msg_id}


@router.post("/conversations/{chat_id}/read")
async def mark_read(
    chat_id: str,
    request: Request,
    current_user: dict = Depends(get_current_user),
):
    conv = _get_conversation_for_user(chat_id, current_user)
    marked_ids: List[str] = []

    for message in db.find_many("messages", chat_id=chat_id):
        if message.get("sender_id") != current_user["id"] and not message.get("is_read"):
            db.update_one("messages", message["id"], {"is_read": True})
            marked_ids.append(message["id"])

    if marked_ids:
        await _send_event_to_users(
            _manager(request),
            conv.get("participant_ids", []),
            {
                "type": "message_read",
                "chat_id": chat_id,
                "message_ids": marked_ids,
                "read_by": current_user["id"],
            },
            exclude=current_user["id"],
        )

    return {"message": "Marked read.", "count": len(marked_ids)}


@router.post("/conversations/{chat_id}/pin")
def toggle_pin(chat_id: str, current_user: dict = Depends(get_current_user)):
    conv = _get_conversation_for_user(chat_id, current_user)
    existing = db.find_one("chat_pins", user_id=current_user["id"], chat_id=chat_id)
    if existing:
        db.delete_one("chat_pins", existing["id"])
        return {"pinned": False}
    db.insert(
        "chat_pins",
        {
            "id": uuid.uuid4().hex,
            "user_id": current_user["id"],
            "chat_id": conv["id"],
            "created_at": _now(),
        },
    )
    return {"pinned": True}


@router.post("/conversations/{chat_id}/mute")
def toggle_mute(chat_id: str, current_user: dict = Depends(get_current_user)):
    conv = _get_conversation_for_user(chat_id, current_user)
    existing = db.find_one("chat_mutes", user_id=current_user["id"], chat_id=chat_id)
    if existing:
        db.delete_one("chat_mutes", existing["id"])
        return {"muted": False}
    db.insert(
        "chat_mutes",
        {
            "id": uuid.uuid4().hex,
            "user_id": current_user["id"],
            "chat_id": conv["id"],
            "created_at": _now(),
        },
    )
    return {"muted": True}


@router.get("/unread-count")
def get_unread_count(current_user: dict = Depends(get_current_user)):
    total = 0
    for conv in db.find_all("conversations"):
        if current_user["id"] not in conv.get("participant_ids", []):
            continue
        messages = db.find_many("messages", chat_id=conv["id"])
        total += len(
            [
                message
                for message in messages
                if message.get("sender_id") != current_user["id"] and not message.get("is_read")
            ]
        )
    return {"unread_count": total}
