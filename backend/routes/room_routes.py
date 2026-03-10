"""room_routes.py — Study rooms + Pomodoro (JSON store)"""
import uuid
from datetime import datetime, timezone
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel
import database as db
from auth import get_current_user

router = APIRouter()
def _now(): return datetime.now(timezone.utc).isoformat()

def _serialize_room(r, cu):
    members = db.find_many("room_members", room_id=r["id"])
    host = db.find_one("users", id=r["host_id"]) or {}
    member_users = []
    for m in members[:4]:
        u = db.find_one("users", id=m["user_id"])
        if u: member_users.append({"id": u["id"], "name": u["name"], "username": u["username"], "avatar_url": u.get("avatar_url")})
    return {**r,
            "host": {"id": host.get("id"), "name": host.get("name"), "username": host.get("username"), "avatar_url": host.get("avatar_url")},
            "members": member_users, "member_count": len(members),
            "is_mine": r["host_id"] == cu["id"],
            "password": None}  # never expose password

class RoomCreate(BaseModel):
    name: str; subject: Optional[str]=None; exam_target: Optional[str]=None
    max_members: int=5; is_private: bool=False; password: Optional[str]=None

class JoinRoom(BaseModel):
    password: Optional[str]=None

@router.get("")
def get_rooms(limit: int=30, current_user: dict=Depends(get_current_user)):
    rooms = db.find_all("rooms")
    rooms.sort(key=lambda r: len(db.find_many("room_members", room_id=r["id"])), reverse=True)
    return [_serialize_room(r, current_user) for r in rooms[:limit]]

@router.get("/my")
def get_my_rooms(current_user: dict=Depends(get_current_user)):
    memberships = db.find_many("room_members", user_id=current_user["id"])
    room_ids = {m["room_id"] for m in memberships}
    rooms = [db.find_one("rooms", id=rid) for rid in room_ids]
    return [_serialize_room(r, current_user) for r in rooms if r]

@router.post("", status_code=201)
def create_room(req: RoomCreate, current_user: dict=Depends(get_current_user)):
    if not req.name.strip(): raise HTTPException(400, "Room name required.")
    if req.is_private and not req.password: raise HTTPException(400, "Password required for private rooms.")
    room = {"id": uuid.uuid4().hex, "name": req.name.strip(), "host_id": current_user["id"],
            "subject": req.subject, "exam_target": req.exam_target,
            "max_members": req.max_members, "is_private": req.is_private,
            "password": req.password if req.is_private else None,
            "pomodoro_active": False, "pomodoro_start": None, "created_at": _now()}
    db.insert("rooms", room)
    db.insert("room_members", {"id": uuid.uuid4().hex, "room_id": room["id"],
                                "user_id": current_user["id"], "is_host": True,
                                "study_time_mins": 0, "joined_at": _now()})
    return _serialize_room(room, current_user)

@router.get("/{room_id}")
def get_room(room_id: str, current_user: dict=Depends(get_current_user)):
    room = db.find_one("rooms", id=room_id)
    if not room: raise HTTPException(404)
    members = db.find_many("room_members", room_id=room_id)
    member_details = []
    for m in members:
        u = db.find_one("users", id=m["user_id"])
        if u: member_details.append({**m, "user": {"id": u["id"], "name": u["name"], "username": u["username"], "avatar_url": u.get("avatar_url")}})
    return {"room": _serialize_room(room, current_user), "members": member_details}

@router.post("/{room_id}/join")
def join_room(room_id: str, req: JoinRoom, current_user: dict=Depends(get_current_user)):
    room = db.find_one("rooms", id=room_id)
    if not room: raise HTTPException(404)
    members = db.find_many("room_members", room_id=room_id)
    if len(members) >= room.get("max_members", 5): raise HTTPException(400, "Room is full.")
    if room.get("is_private") and room.get("password") != req.password: raise HTTPException(403, "Wrong password.")
    if db.exists("room_members", room_id=room_id, user_id=current_user["id"]):
        return {"message": "Already in room."}
    db.insert("room_members", {"id": uuid.uuid4().hex, "room_id": room_id,
                                "user_id": current_user["id"], "is_host": False,
                                "study_time_mins": 0, "joined_at": _now()})
    return {"message": "Joined."}

@router.post("/{room_id}/leave")
def leave_room(room_id: str, current_user: dict=Depends(get_current_user)):
    m = db.find_one("room_members", room_id=room_id, user_id=current_user["id"])
    if m: db.delete_one("room_members", m["id"])
    room = db.find_one("rooms", id=room_id)
    if room and room["host_id"] == current_user["id"]:
        remaining = db.find_many("room_members", room_id=room_id)
        if remaining:
            db.update_one("rooms", room_id, {"host_id": remaining[0]["user_id"]})
            db.update_one("room_members", remaining[0]["id"], {"is_host": True})
        else:
            db.delete_one("rooms", room_id)
    return {"message": "Left room."}

@router.post("/{room_id}/kick/{user_id}")
def kick_member(room_id: str, user_id: str, current_user: dict=Depends(get_current_user)):
    room = db.find_one("rooms", id=room_id)
    if not room or room["host_id"] != current_user["id"]: raise HTTPException(403)
    m = db.find_one("room_members", room_id=room_id, user_id=user_id)
    if m: db.delete_one("room_members", m["id"])
    return {"message": "Kicked."}

@router.post("/{room_id}/transfer/{user_id}")
def transfer_host(room_id: str, user_id: str, current_user: dict=Depends(get_current_user)):
    room = db.find_one("rooms", id=room_id)
    if not room or room["host_id"] != current_user["id"]: raise HTTPException(403)
    db.update_one("rooms", room_id, {"host_id": user_id})
    for m in db.find_many("room_members", room_id=room_id):
        db.update_one("room_members", m["id"], {"is_host": m["user_id"] == user_id})
    return {"message": "Host transferred."}

@router.post("/{room_id}/pomodoro/start")
def start_pomodoro(room_id: str, current_user: dict=Depends(get_current_user)):
    room = db.find_one("rooms", id=room_id)
    if not room or room["host_id"] != current_user["id"]: raise HTTPException(403)
    db.update_one("rooms", room_id, {"pomodoro_active": True, "pomodoro_start": _now()})
    return {"pomodoro_active": True}

@router.post("/{room_id}/pomodoro/stop")
def stop_pomodoro(room_id: str, current_user: dict=Depends(get_current_user)):
    room = db.find_one("rooms", id=room_id)
    if not room or room["host_id"] != current_user["id"]: raise HTTPException(403)
    db.update_one("rooms", room_id, {"pomodoro_active": False, "pomodoro_start": None})
    return {"pomodoro_active": False}
