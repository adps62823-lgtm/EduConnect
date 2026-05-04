"""room_routes.py - Study rooms + Pomodoro (JSON store)."""

import uuid
from datetime import datetime, timezone
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Request
from pydantic import BaseModel

import database as db
from auth import get_current_user

router = APIRouter()


def _now() -> str:
    return datetime.now(timezone.utc).isoformat()


def _user_payload(user: dict | None) -> dict | None:
    if not user:
        return None
    return {
        "id": user["id"],
        "name": user["name"],
        "username": user["username"],
        "avatar_url": user.get("avatar_url"),
    }


def _room_members(room_id: str) -> list[dict]:
    return db.find_many("room_members", room_id=room_id)


def _room_member_user_ids(room_id: str) -> list[str]:
    return [member["user_id"] for member in _room_members(room_id) if member.get("user_id")]


def _serialize_room(room: dict, current_user: dict) -> dict:
    members = _room_members(room["id"])
    host = db.find_one("users", id=room["host_id"]) or {}
    preview_members = []
    for member in members[:4]:
        user = db.find_one("users", id=member["user_id"])
        if user:
            preview_members.append(_user_payload(user))

    return {
        **room,
        "host": _user_payload(host),
        "members": preview_members,
        "member_count": len(members),
        "is_mine": room["host_id"] == current_user["id"],
        "password": None,
    }


def _serialize_room_members(room_id: str) -> list[dict]:
    details = []
    for member in _room_members(room_id):
        user = db.find_one("users", id=member["user_id"])
        if user:
            details.append({
                **member,
                "user": _user_payload(user),
            })
    return details


def _ensure_room_exists(room_id: str) -> dict:
    room = db.find_one("rooms", id=room_id)
    if not room:
        raise HTTPException(404, "Room not found.")
    return room


def _ensure_room_member(room_id: str, user_id: str) -> dict:
    membership = db.find_one("room_members", room_id=room_id, user_id=user_id)
    if not membership:
        raise HTTPException(403, "You are not a member of this room.")
    return membership


async def _emit_room_event(request: Request, room_id: str, message: dict, exclude: str | None = None):
    manager = getattr(request.app.state, "manager", None)
    if manager is None:
        return
    member_ids = _room_member_user_ids(room_id)
    if member_ids:
        await manager.send_to_users(member_ids, message, exclude=exclude)


class RoomCreate(BaseModel):
    name: str
    subject: Optional[str] = None
    exam_target: Optional[str] = None
    max_members: int = 5
    is_private: bool = False
    password: Optional[str] = None


class JoinRoom(BaseModel):
    password: Optional[str] = None


@router.get("")
def get_rooms(limit: int = 30, current_user: dict = Depends(get_current_user)):
    rooms = db.find_all("rooms")
    rooms.sort(key=lambda room: len(_room_members(room["id"])), reverse=True)
    return [_serialize_room(room, current_user) for room in rooms[:limit]]


@router.get("/my")
def get_my_rooms(current_user: dict = Depends(get_current_user)):
    memberships = db.find_many("room_members", user_id=current_user["id"])
    room_ids = {membership["room_id"] for membership in memberships}
    rooms = [db.find_one("rooms", id=room_id) for room_id in room_ids]
    return [_serialize_room(room, current_user) for room in rooms if room]


@router.post("", status_code=201)
def create_room(req: RoomCreate, current_user: dict = Depends(get_current_user)):
    if not req.name.strip():
        raise HTTPException(400, "Room name required.")
    if req.is_private and not req.password:
        raise HTTPException(400, "Password required for private rooms.")

    room = {
        "id": uuid.uuid4().hex,
        "name": req.name.strip(),
        "host_id": current_user["id"],
        "subject": req.subject,
        "exam_target": req.exam_target,
        "max_members": req.max_members,
        "is_private": req.is_private,
        "password": req.password if req.is_private else None,
        "pomodoro_active": False,
        "pomodoro_start": None,
        "created_at": _now(),
    }
    db.insert("rooms", room)
    db.insert("room_members", {
        "id": uuid.uuid4().hex,
        "room_id": room["id"],
        "user_id": current_user["id"],
        "is_host": True,
        "study_time_mins": 0,
        "joined_at": _now(),
    })
    return _serialize_room(room, current_user)


@router.get("/{room_id}")
def get_room(room_id: str, current_user: dict = Depends(get_current_user)):
    room = _ensure_room_exists(room_id)
    _ensure_room_member(room_id, current_user["id"])
    return {
        "room": _serialize_room(room, current_user),
        "members": _serialize_room_members(room_id),
    }


@router.post("/{room_id}/join")
def join_room(room_id: str, req: JoinRoom, current_user: dict = Depends(get_current_user)):
    room = _ensure_room_exists(room_id)
    members = _room_members(room_id)

    if db.exists("room_members", room_id=room_id, user_id=current_user["id"]):
        return {"message": "Already in room."}

    if len(members) >= room.get("max_members", 5):
        raise HTTPException(400, "Room is full.")
    if room.get("is_private") and room.get("password") != req.password:
        raise HTTPException(403, "Wrong password.")

    db.insert("room_members", {
        "id": uuid.uuid4().hex,
        "room_id": room_id,
        "user_id": current_user["id"],
        "is_host": False,
        "study_time_mins": 0,
        "joined_at": _now(),
    })
    return {"message": "Joined."}


@router.post("/{room_id}/leave")
async def leave_room(room_id: str, request: Request, current_user: dict = Depends(get_current_user)):
    room = _ensure_room_exists(room_id)
    membership = _ensure_room_member(room_id, current_user["id"])
    db.delete_one("room_members", membership["id"])

    remaining = _room_members(room_id)
    room_deleted = False
    new_host_id = None

    if room["host_id"] == current_user["id"]:
        if remaining:
            new_host_id = remaining[0]["user_id"]
            db.update_one("rooms", room_id, {"host_id": new_host_id})
            db.update_one("room_members", remaining[0]["id"], {"is_host": True})
        else:
            db.delete_one("rooms", room_id)
            room_deleted = True

    if not room_deleted:
        await _emit_room_event(
            request,
            room_id,
            {
                "type": "room_leave",
                "room_id": room_id,
                "user_id": current_user["id"],
                "user": _user_payload(current_user),
                "new_host_id": new_host_id,
            },
            exclude=current_user["id"],
        )

    return {"message": "Left room."}


@router.post("/{room_id}/kick/{user_id}")
async def kick_member(room_id: str, user_id: str, request: Request, current_user: dict = Depends(get_current_user)):
    room = _ensure_room_exists(room_id)
    if room["host_id"] != current_user["id"]:
        raise HTTPException(403, "Only the host can kick members.")
    if user_id == current_user["id"]:
        raise HTTPException(400, "Host cannot kick themselves.")

    target_membership = db.find_one("room_members", room_id=room_id, user_id=user_id)
    if not target_membership:
        raise HTTPException(404, "Member not found.")

    target_user = db.find_one("users", id=user_id)
    db.delete_one("room_members", target_membership["id"])

    manager = getattr(request.app.state, "manager", None)
    if manager is not None:
        payload = {
            "type": "room_kick",
            "room_id": room_id,
            "user_id": user_id,
            "user": _user_payload(target_user),
            "actor_id": current_user["id"],
        }
        await manager.send_to_user(user_id, payload)
        await _emit_room_event(request, room_id, payload)

    return {"message": "Kicked."}


@router.post("/{room_id}/transfer/{user_id}")
def transfer_host(room_id: str, user_id: str, current_user: dict = Depends(get_current_user)):
    room = _ensure_room_exists(room_id)
    if room["host_id"] != current_user["id"]:
        raise HTTPException(403, "Only the host can transfer host role.")

    _ensure_room_member(room_id, user_id)

    db.update_one("rooms", room_id, {"host_id": user_id})
    for member in _room_members(room_id):
        db.update_one("room_members", member["id"], {"is_host": member["user_id"] == user_id})

    return {"message": "Host transferred."}


@router.post("/{room_id}/pomodoro/start")
def start_pomodoro(room_id: str, current_user: dict = Depends(get_current_user)):
    room = _ensure_room_exists(room_id)
    if room["host_id"] != current_user["id"]:
        raise HTTPException(403, "Only the host can start Pomodoro.")
    _ensure_room_member(room_id, current_user["id"])
    db.update_one("rooms", room_id, {"pomodoro_active": True, "pomodoro_start": _now()})
    return {"pomodoro_active": True}


@router.post("/{room_id}/pomodoro/stop")
def stop_pomodoro(room_id: str, current_user: dict = Depends(get_current_user)):
    room = _ensure_room_exists(room_id)
    if room["host_id"] != current_user["id"]:
        raise HTTPException(403, "Only the host can stop Pomodoro.")
    _ensure_room_member(room_id, current_user["id"])
    db.update_one("rooms", room_id, {"pomodoro_active": False, "pomodoro_start": None})
    return {"pomodoro_active": False}
