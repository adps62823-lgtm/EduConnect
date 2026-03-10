"""
room_routes.py — Zoom-lite Study Rooms Backend
POST   /api/rooms
GET    /api/rooms
GET    /api/rooms/{room_id}
PUT    /api/rooms/{room_id}
DELETE /api/rooms/{room_id}
POST   /api/rooms/{room_id}/join
POST   /api/rooms/{room_id}/leave
GET    /api/rooms/{room_id}/members
POST   /api/rooms/{room_id}/pomodoro/start
POST   /api/rooms/{room_id}/pomodoro/stop
GET    /api/rooms/my/active
"""

import json
import secrets
from datetime import datetime, timezone
from typing import Optional, List

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, field_validator
from sqlalchemy.orm import Session
from sqlalchemy import desc

from database import get_db
from auth import get_current_user, create_notification
import models

router = APIRouter()


# ══════════════════════════════════════════════════════════
# SCHEMAS
# ══════════════════════════════════════════════════════════

class RoomCreate(BaseModel):
    name: str
    subject: Optional[str] = None
    exam_target: Optional[str] = None
    max_members: int = 5
    is_public: bool = True
    password: Optional[str] = None
    pomodoro_duration: int = 25     # minutes

    @field_validator("max_members")
    @classmethod
    def valid_max(cls, v):
        if not (2 <= v <= 5):
            raise ValueError("Study rooms support 2–5 members.")
        return v

    @field_validator("pomodoro_duration")
    @classmethod
    def valid_pomodoro(cls, v):
        if not (5 <= v <= 90):
            raise ValueError("Pomodoro duration must be 5–90 minutes.")
        return v


class RoomUpdate(BaseModel):
    name: Optional[str] = None
    subject: Optional[str] = None
    exam_target: Optional[str] = None
    is_public: Optional[bool] = None
    pomodoro_duration: Optional[int] = None


class JoinRoomRequest(BaseModel):
    password: Optional[str] = None


class PomodoroStart(BaseModel):
    duration_minutes: Optional[int] = None   # override default if needed


# ══════════════════════════════════════════════════════════
# SERIALIZERS
# ══════════════════════════════════════════════════════════

def serialize_room(
    room: models.StudyRoom,
    current_user: models.User,
) -> dict:
    members = room.members

    return {
        "id": room.id,
        "name": room.name,
        "subject": room.subject,
        "exam_target": room.exam_target,
        "max_members": room.max_members,
        "current_members": len(members),
        "is_active": room.is_active,
        "is_public": room.is_public,
        "has_password": bool(room.password),
        "pomodoro_duration": room.pomodoro_duration,
        "started_at": room.started_at.isoformat() if room.started_at else None,
        "ended_at": room.ended_at.isoformat() if room.ended_at else None,
        "is_full": len(members) >= room.max_members,
        "is_member": current_user in members,
        "is_host": room.host_id == current_user.id,
        "host": {
            "id": room.host.id,
            "name": room.host.name,
            "username": room.host.username,
            "avatar_url": room.host.avatar_url,
            "study_status": room.host.study_status,
        },
        "members": [
            {
                "id": m.id,
                "name": m.name,
                "username": m.username,
                "avatar_url": m.avatar_url,
                "study_status": m.study_status,
                "exam_target": m.exam_target,
            }
            for m in members
        ],
    }


# ══════════════════════════════════════════════════════════
# ROOMS — CRUD
# ══════════════════════════════════════════════════════════

@router.post("", status_code=201)
def create_room(
    req: RoomCreate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    # Check user isn't already hosting an active room
    existing_host = db.query(models.StudyRoom).filter(
        models.StudyRoom.host_id == current_user.id,
        models.StudyRoom.is_active == True,
    ).first()
    if existing_host:
        raise HTTPException(
            status_code=400,
            detail="You are already hosting an active room. End it before creating a new one."
        )

    room = models.StudyRoom(
        name=req.name.strip(),
        host_id=current_user.id,
        subject=req.subject,
        exam_target=req.exam_target or current_user.exam_target,
        max_members=req.max_members,
        is_public=req.is_public,
        password=req.password,
        pomodoro_duration=req.pomodoro_duration,
        is_active=True,
        started_at=datetime.now(timezone.utc),
    )
    db.add(room)
    db.flush()

    # Host auto-joins
    room.members.append(current_user)

    # Update host study status
    current_user.study_status = "studying"
    current_user.study_timer_start = datetime.now(timezone.utc)

    db.commit()
    db.refresh(room)
    return serialize_room(room, current_user)


@router.get("")
def list_rooms(
    subject: Optional[str] = None,
    exam_target: Optional[str] = None,
    active_only: bool = True,
    public_only: bool = True,
    page: int = 1,
    limit: int = 12,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    query = db.query(models.StudyRoom)

    if active_only:
        query = query.filter(models.StudyRoom.is_active == True)
    if public_only:
        query = query.filter(models.StudyRoom.is_public == True)
    if subject:
        query = query.filter(models.StudyRoom.subject == subject)
    if exam_target:
        query = query.filter(models.StudyRoom.exam_target == exam_target)

    total = query.count()
    rooms = (
        query
        .order_by(desc(models.StudyRoom.started_at))
        .offset((page - 1) * limit)
        .limit(limit)
        .all()
    )

    return {
        "rooms": [serialize_room(r, current_user) for r in rooms],
        "total": total,
        "page": page,
        "pages": (total + limit - 1) // limit,
    }


@router.get("/my/active")
def get_my_active_room(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    """Returns the room the current user is currently in (if any)."""
    room = (
        db.query(models.StudyRoom)
        .filter(
            models.StudyRoom.is_active == True,
            models.StudyRoom.members.any(models.User.id == current_user.id),
        )
        .first()
    )
    if not room:
        return None
    return serialize_room(room, current_user)


@router.get("/{room_id}")
def get_room(
    room_id: str,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    room = db.query(models.StudyRoom).filter(
        models.StudyRoom.id == room_id
    ).first()
    if not room:
        raise HTTPException(status_code=404, detail="Room not found.")
    return serialize_room(room, current_user)


@router.put("/{room_id}")
def update_room(
    room_id: str,
    req: RoomUpdate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    room = _get_room_or_404(room_id, db)
    if room.host_id != current_user.id:
        raise HTTPException(status_code=403, detail="Only the host can update the room.")

    if req.name is not None:
        room.name = req.name.strip()
    if req.subject is not None:
        room.subject = req.subject
    if req.exam_target is not None:
        room.exam_target = req.exam_target
    if req.is_public is not None:
        room.is_public = req.is_public
    if req.pomodoro_duration is not None:
        if not (5 <= req.pomodoro_duration <= 90):
            raise HTTPException(status_code=400, detail="Pomodoro must be 5–90 min.")
        room.pomodoro_duration = req.pomodoro_duration

    db.commit()
    db.refresh(room)
    return serialize_room(room, current_user)


@router.delete("/{room_id}")
def delete_room(
    room_id: str,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    room = _get_room_or_404(room_id, db)
    if room.host_id != current_user.id and current_user.role != "admin":
        raise HTTPException(status_code=403, detail="Only the host can delete the room.")

    db.delete(room)
    db.commit()
    return {"message": "Room deleted."}


# ══════════════════════════════════════════════════════════
# JOIN / LEAVE
# ══════════════════════════════════════════════════════════

@router.post("/{room_id}/join")
def join_room(
    room_id: str,
    req: JoinRoomRequest,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    room = _get_room_or_404(room_id, db)

    if not room.is_active:
        raise HTTPException(status_code=400, detail="This room has ended.")
    if current_user in room.members:
        # Already in — just return current state
        return serialize_room(room, current_user)
    if len(room.members) >= room.max_members:
        raise HTTPException(
            status_code=400,
            detail=f"Room is full ({room.max_members}/{room.max_members} members)."
        )
    if room.password and room.password != req.password:
        raise HTTPException(status_code=403, detail="Incorrect room password.")

    # Leave any other active room first
    other_rooms = db.query(models.StudyRoom).filter(
        models.StudyRoom.is_active == True,
        models.StudyRoom.members.any(models.User.id == current_user.id),
        models.StudyRoom.id != room_id,
    ).all()
    for other in other_rooms:
        other.members.remove(current_user)
        _check_empty_room(other, db)

    room.members.append(current_user)

    # Update study status
    current_user.study_status = "studying"
    current_user.study_timer_start = datetime.now(timezone.utc)

    # Notify host
    if room.host_id != current_user.id:
        create_notification(
            db, room.host_id, "room_join",
            f"{current_user.name} joined your study room \"{room.name}\".",
            link=f"/rooms/{room_id}",
        )

    db.commit()
    db.refresh(room)
    return serialize_room(room, current_user)


@router.post("/{room_id}/leave")
def leave_room(
    room_id: str,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    room = _get_room_or_404(room_id, db)

    if current_user not in room.members:
        raise HTTPException(status_code=400, detail="You are not in this room.")

    room.members.remove(current_user)

    # Accumulate study time
    _accumulate_study_time(current_user, db)

    # If host leaves — close room or transfer host
    if room.host_id == current_user.id:
        if room.members:
            # Transfer host to next member
            new_host = room.members[0]
            room.host_id = new_host.id
            create_notification(
                db, new_host.id, "room_host",
                f"You are now the host of \"{room.name}\".",
                link=f"/rooms/{room_id}",
            )
        else:
            # No members left — close room
            room.is_active = False
            room.ended_at = datetime.now(timezone.utc)

    _check_empty_room(room, db)
    db.commit()
    return {"message": "Left room.", "room_ended": not room.is_active}


# ══════════════════════════════════════════════════════════
# MEMBERS
# ══════════════════════════════════════════════════════════

@router.get("/{room_id}/members")
def get_members(
    room_id: str,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    room = _get_room_or_404(room_id, db)
    return [
        {
            "id": m.id,
            "name": m.name,
            "username": m.username,
            "avatar_url": m.avatar_url,
            "study_status": m.study_status,
            "exam_target": m.exam_target,
            "is_host": m.id == room.host_id,
        }
        for m in room.members
    ]


# ══════════════════════════════════════════════════════════
# POMODORO TIMER
# Managed server-side so all room members stay in sync.
# Actual countdown runs client-side; server stores the
# session start time so late joiners can sync.
# ══════════════════════════════════════════════════════════

@router.post("/{room_id}/pomodoro/start")
def start_pomodoro(
    room_id: str,
    req: PomodoroStart,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    room = _get_room_or_404(room_id, db)
    if room.host_id != current_user.id:
        raise HTTPException(status_code=403, detail="Only the host can start the timer.")
    if current_user not in room.members:
        raise HTTPException(status_code=400, detail="You are not in this room.")

    duration = req.duration_minutes or room.pomodoro_duration

    # Store timer start on the room
    room.started_at = datetime.now(timezone.utc)
    if req.duration_minutes:
        room.pomodoro_duration = req.duration_minutes

    db.commit()

    return {
        "started_at": room.started_at.isoformat(),
        "duration_minutes": room.pomodoro_duration,
        "ends_at": (
            datetime.now(timezone.utc).timestamp() + duration * 60
        ),
    }


@router.post("/{room_id}/pomodoro/stop")
def stop_pomodoro(
    room_id: str,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    room = _get_room_or_404(room_id, db)
    if room.host_id != current_user.id:
        raise HTTPException(status_code=403, detail="Only the host can stop the timer.")

    room.started_at = None
    db.commit()
    return {"message": "Pomodoro timer stopped."}


# ══════════════════════════════════════════════════════════
# ROOM HISTORY  (user's past rooms)
# ══════════════════════════════════════════════════════════

@router.get("/history/me")
def get_room_history(
    limit: int = 10,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    rooms = (
        db.query(models.StudyRoom)
        .filter(
            models.StudyRoom.members.any(models.User.id == current_user.id),
            models.StudyRoom.is_active == False,
        )
        .order_by(desc(models.StudyRoom.ended_at))
        .limit(limit)
        .all()
    )
    return [serialize_room(r, current_user) for r in rooms]


# ══════════════════════════════════════════════════════════
# KICK MEMBER  (host only)
# ══════════════════════════════════════════════════════════

@router.post("/{room_id}/kick/{user_id}")
def kick_member(
    room_id: str,
    user_id: str,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    room = _get_room_or_404(room_id, db)
    if room.host_id != current_user.id:
        raise HTTPException(status_code=403, detail="Only the host can kick members.")
    if user_id == current_user.id:
        raise HTTPException(status_code=400, detail="Cannot kick yourself.")

    target = db.query(models.User).filter(models.User.id == user_id).first()
    if not target or target not in room.members:
        raise HTTPException(status_code=404, detail="Member not found in room.")

    room.members.remove(target)
    _accumulate_study_time(target, db)
    _check_empty_room(room, db)

    create_notification(
        db, user_id, "room_kick",
        f"You were removed from the study room \"{room.name}\".",
    )
    db.commit()
    return {"message": f"{target.name} was removed from the room."}


# ══════════════════════════════════════════════════════════
# INTERNAL HELPERS
# ══════════════════════════════════════════════════════════

def _get_room_or_404(room_id: str, db: Session) -> models.StudyRoom:
    room = db.query(models.StudyRoom).filter(
        models.StudyRoom.id == room_id
    ).first()
    if not room:
        raise HTTPException(status_code=404, detail="Room not found.")
    return room


def _check_empty_room(room: models.StudyRoom, db: Session) -> None:
    """Auto-close a room if it has no members left."""
    if not room.members and room.is_active:
        room.is_active = False
        room.ended_at = datetime.now(timezone.utc)


def _accumulate_study_time(user: models.User, db: Session) -> None:
    """Add elapsed study time to the user's streak total."""
    if user.study_timer_start and user.streak:
        elapsed = (
            datetime.now(timezone.utc) - user.study_timer_start
        ).total_seconds() / 60
        user.streak.total_study_mins += int(elapsed)
    user.study_timer_start = None
    user.study_status = "chilling"
