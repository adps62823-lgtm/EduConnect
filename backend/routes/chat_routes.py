"""chat_routes.py — WhatsApp-clone messaging (JSON store)"""
import uuid, os, shutil
from datetime import datetime, timezone
from typing import Optional, List
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form
from pydantic import BaseModel
import database as db
from auth import get_current_user

router = APIRouter()
UPLOAD_DIR = os.getenv("UPLOAD_DIR", "uploads")
def _now(): return datetime.now(timezone.utc).isoformat()

def _fmt_user(u):
    if not u: return None
    return {"id": u["id"], "name": u["name"], "username": u["username"], "avatar_url": u.get("avatar_url")}

def _fmt_msg(m, cu):
    if not m: return None
    sender = db.find_one("users", id=m["sender_id"]) or {}
    return {**m, "is_mine": m["sender_id"] == cu["id"], "sender": _fmt_user(sender)}

def _serialize_conv(conv, cu):
    messages = sorted(db.find_many("messages", chat_id=conv["id"]), key=lambda m: m["created_at"])
    last = messages[-1] if messages else None
    unread = len([m for m in messages if m.get("sender_id") != cu["id"] and not m.get("is_read")])
    if conv.get("is_group"):
        return {**conv, "last_message": _fmt_msg(last, cu) if last else None, "unread_count": unread}
    other_id = next((pid for pid in conv.get("participant_ids",[]) if pid != cu["id"]), None)
    other = db.find_one("users", id=other_id) if other_id else None
    return {**conv, "other_user": _fmt_user(other),
            "name": other["name"] if other else "Unknown",
            "last_message": _fmt_msg(last, cu) if last else None, "unread_count": unread}

@router.get("/conversations")
def get_conversations(current_user: dict=Depends(get_current_user)):
    mine = [c for c in db.find_all("conversations") if current_user["id"] in c.get("participant_ids",[])]
    mine.sort(key=lambda c: c.get("updated_at", c["created_at"]), reverse=True)
    return [_serialize_conv(c, current_user) for c in mine]

@router.get("/conversations/{chat_id}")
def get_conversation(chat_id: str, current_user: dict=Depends(get_current_user)):
    conv = db.find_one("conversations", id=chat_id)
    if not conv: raise HTTPException(404)
    if current_user["id"] not in conv.get("participant_ids",[]): raise HTTPException(403)
    participants = [_fmt_user(db.find_one("users", id=pid)) for pid in conv.get("participant_ids",[])]
    return {**_serialize_conv(conv, current_user), "participants": participants}

@router.post("/dm/{user_id}")
def create_dm(user_id: str, current_user: dict=Depends(get_current_user)):
    if user_id == current_user["id"]: raise HTTPException(400, "Cannot DM yourself.")
    other = db.find_one("users", id=user_id)
    if not other: raise HTTPException(404)
    for conv in db.find_all("conversations"):
        if not conv.get("is_group") and set(conv.get("participant_ids",[])) == {current_user["id"], user_id}:
            return _serialize_conv(conv, current_user)
    conv = {"id": uuid.uuid4().hex, "is_group": False, "name": other["name"],
            "participant_ids": [current_user["id"], user_id],
            "created_by": current_user["id"], "created_at": _now(), "updated_at": _now()}
    db.insert("conversations", conv)
    return _serialize_conv(conv, current_user)

class GroupCreate(BaseModel):
    name: str
    member_ids: List[str]

@router.post("/group")
def create_group(req: GroupCreate, current_user: dict=Depends(get_current_user)):
    if not req.name.strip(): raise HTTPException(400, "Group name required.")
    pids = list({current_user["id"]} | set(req.member_ids))
    conv = {"id": uuid.uuid4().hex, "is_group": True, "name": req.name.strip(),
            "participant_ids": pids, "created_by": current_user["id"],
            "created_at": _now(), "updated_at": _now()}
    db.insert("conversations", conv)
    return _serialize_conv(conv, current_user)

@router.post("/conversations/{chat_id}/members/{user_id}")
def add_member(chat_id: str, user_id: str, current_user: dict=Depends(get_current_user)):
    conv = db.find_one("conversations", id=chat_id)
    if not conv or not conv.get("is_group"): raise HTTPException(404)
    if conv.get("created_by") != current_user["id"]: raise HTTPException(403)
    ids = conv.get("participant_ids",[])
    if user_id not in ids:
        ids.append(user_id)
        db.update_one("conversations", chat_id, {"participant_ids": ids})
    return {"message": "Member added."}

@router.delete("/conversations/{chat_id}/members/{user_id}")
def remove_member(chat_id: str, user_id: str, current_user: dict=Depends(get_current_user)):
    conv = db.find_one("conversations", id=chat_id)
    if not conv: raise HTTPException(404)
    if conv.get("created_by") != current_user["id"]: raise HTTPException(403)
    ids = [i for i in conv.get("participant_ids",[]) if i != user_id]
    db.update_one("conversations", chat_id, {"participant_ids": ids})
    return {"message": "Member removed."}

@router.get("/conversations/{chat_id}/messages")
def get_messages(chat_id: str, page: int=1, limit: int=40, current_user: dict=Depends(get_current_user)):
    conv = db.find_one("conversations", id=chat_id)
    if not conv or current_user["id"] not in conv.get("participant_ids",[]): raise HTTPException(403)
    messages = sorted(db.find_many("messages", chat_id=chat_id), key=lambda m: m["created_at"], reverse=True)
    total = len(messages)
    page_msgs = list(reversed(messages[(page-1)*limit:page*limit]))
    return {"messages": [_fmt_msg(m, current_user) for m in page_msgs],
            "total": total, "has_more": page*limit < total}

@router.post("/conversations/{chat_id}/messages", status_code=201)
async def send_message(chat_id: str, content: str=Form(""),
                       file: Optional[UploadFile]=File(None),
                       current_user: dict=Depends(get_current_user)):
    conv = db.find_one("conversations", id=chat_id)
    if not conv or current_user["id"] not in conv.get("participant_ids",[]): raise HTTPException(403)
    media_url = None; media_type = None
    if file and file.filename:
        ext = os.path.splitext(file.filename)[-1].lower()
        media_type = "image" if ext in {".jpg",".jpeg",".png",".webp",".gif"} else "file"
        fname = f"{uuid.uuid4().hex}{ext}"
        folder = os.path.join(UPLOAD_DIR, "chat")
        os.makedirs(folder, exist_ok=True)
        with open(os.path.join(folder, fname), "wb") as out:
            shutil.copyfileobj(file.file, out)
        media_url = f"/uploads/chat/{fname}"
    if not content.strip() and not media_url: raise HTTPException(400, "Message cannot be empty.")
    msg = {"id": uuid.uuid4().hex, "chat_id": chat_id, "sender_id": current_user["id"],
           "content": content.strip() or None, "media_url": media_url, "media_type": media_type,
           "is_read": False, "created_at": _now()}
    db.insert("messages", msg)
    db.update_one("conversations", chat_id, {"updated_at": _now()})
    return _fmt_msg(msg, current_user)

@router.delete("/conversations/{chat_id}/messages/{msg_id}")
def delete_message(chat_id: str, msg_id: str, current_user: dict=Depends(get_current_user)):
    msg = db.find_one("messages", id=msg_id, chat_id=chat_id)
    if not msg: raise HTTPException(404)
    if msg["sender_id"] != current_user["id"]: raise HTTPException(403)
    db.delete_one("messages", msg_id)
    return {"message": "Deleted."}

@router.post("/conversations/{chat_id}/read")
def mark_read(chat_id: str, current_user: dict=Depends(get_current_user)):
    for msg in db.find_many("messages", chat_id=chat_id):
        if msg.get("sender_id") != current_user["id"] and not msg.get("is_read"):
            db.update_one("messages", msg["id"], {"is_read": True})
    return {"message": "Marked read."}

@router.get("/unread-count")
def get_unread_count(current_user: dict = Depends(get_current_user)):
    """Total unread messages across all conversations."""
    convs = [c for c in db.find_all("conversations")
             if current_user["id"] in c.get("participant_ids", [])]
    total = 0
    for conv in convs:
        msgs = db.find_many("messages", chat_id=conv["id"])
        total += len([m for m in msgs
                      if m.get("sender_id") != current_user["id"]
                      and not m.get("is_read")])
    return {"unread_count": total}
