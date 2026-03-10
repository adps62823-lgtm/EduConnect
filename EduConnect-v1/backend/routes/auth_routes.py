"""
auth_routes.py — Authentication & User Management
POST   /api/auth/register
POST   /api/auth/login
GET    /api/auth/me
PUT    /api/auth/me
PUT    /api/auth/change-password
POST   /api/auth/follow/{user_id}
DELETE /api/auth/follow/{user_id}
GET    /api/auth/search
GET    /api/auth/users/{user_id}
PUT    /api/auth/status
POST   /api/auth/avatar
POST   /api/auth/cover
"""

import os
import json
import shutil
from datetime import datetime, timezone
from typing import Optional, List

from fastapi import (
    APIRouter, Depends, HTTPException, status,
    UploadFile, File, Form
)
from fastapi.security import OAuth2PasswordRequestForm
from pydantic import BaseModel, EmailStr, field_validator
from sqlalchemy.orm import Session

from database import get_db
from auth import (
    hash_password, verify_password,
    create_access_token, get_current_user,
    validate_school_email, create_notification,
)
import models

router = APIRouter()
UPLOAD_DIR = os.getenv("UPLOAD_DIR", "uploads")


# ══════════════════════════════════════════════════════════
# SCHEMAS (Pydantic)
# ══════════════════════════════════════════════════════════

class RegisterRequest(BaseModel):
    name: str
    username: str
    email: EmailStr
    password: str
    grade: Optional[str] = None
    school: Optional[str] = None
    exam_target: Optional[str] = None
    region: Optional[str] = None
    language: Optional[str] = None
    timezone: Optional[str] = "Asia/Kolkata"

    @field_validator("username")
    @classmethod
    def username_valid(cls, v):
        v = v.strip().lower()
        if len(v) < 3:
            raise ValueError("Username must be at least 3 characters.")
        if not v.replace("_", "").replace(".", "").isalnum():
            raise ValueError("Username can only contain letters, numbers, _ and .")
        return v

    @field_validator("password")
    @classmethod
    def password_strong(cls, v):
        if len(v) < 6:
            raise ValueError("Password must be at least 6 characters.")
        return v


class LoginResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: dict


class UpdateProfileRequest(BaseModel):
    name: Optional[str] = None
    bio: Optional[str] = None
    grade: Optional[str] = None
    school: Optional[str] = None
    exam_target: Optional[str] = None
    region: Optional[str] = None
    language: Optional[str] = None
    timezone: Optional[str] = None
    subjects: Optional[List[str]] = None


class ChangePasswordRequest(BaseModel):
    current_password: str
    new_password: str

    @field_validator("new_password")
    @classmethod
    def password_strong(cls, v):
        if len(v) < 6:
            raise ValueError("New password must be at least 6 characters.")
        return v


class StudyStatusRequest(BaseModel):
    status: str  # studying | break | sleeping | chilling

    @field_validator("status")
    @classmethod
    def valid_status(cls, v):
        allowed = {"studying", "break", "sleeping", "chilling"}
        if v not in allowed:
            raise ValueError(f"Status must be one of {allowed}")
        return v


# ══════════════════════════════════════════════════════════
# HELPERS
# ══════════════════════════════════════════════════════════

def user_to_dict(user: models.User, include_private: bool = False) -> dict:
    d = {
        "id": user.id,
        "name": user.name,
        "username": user.username,
        "avatar_url": user.avatar_url,
        "cover_url": user.cover_url,
        "bio": user.bio,
        "grade": user.grade,
        "school": user.school,
        "exam_target": user.exam_target,
        "subjects": json.loads(user.subjects) if user.subjects else [],
        "region": user.region,
        "language": user.language,
        "timezone": user.timezone,
        "study_status": user.study_status,
        "study_timer_start": user.study_timer_start.isoformat() if user.study_timer_start else None,
        "help_points": user.help_points,
        "reputation": user.reputation,
        "role": user.role,
        "is_verified": user.is_verified,
        "created_at": user.created_at.isoformat() if user.created_at else None,
        "followers_count": len(user.followers_list) if user.followers_list else 0,
        "following_count": len(user.following) if user.following else 0,
        "streak": {
            "current": user.streak.current_streak if user.streak else 0,
            "longest": user.streak.longest_streak if user.streak else 0,
        } if user.streak else {"current": 0, "longest": 0},
    }
    if include_private:
        d["email"] = user.email
    return d


def save_upload(upload: UploadFile, subdir: str, user_id: str) -> str:
    ext = os.path.splitext(upload.filename)[-1].lower() or ".jpg"
    filename = f"{user_id}{ext}"
    path = os.path.join(UPLOAD_DIR, subdir, filename)
    with open(path, "wb") as f:
        shutil.copyfileobj(upload.file, f)
    return f"/uploads/{subdir}/{filename}"


def ensure_streak(db: Session, user: models.User) -> None:
    if not user.streak:
        streak = models.Streak(user_id=user.id)
        db.add(streak)
        db.flush()


def ensure_theme(db: Session, user: models.User) -> None:
    if not user.theme_settings:
        theme = models.ThemeSettings(user_id=user.id)
        db.add(theme)
        db.flush()


# ══════════════════════════════════════════════════════════
# ROUTES
# ══════════════════════════════════════════════════════════

# ── REGISTER ─────────────────────────────────────────────
@router.post("/register", status_code=status.HTTP_201_CREATED)
def register(req: RegisterRequest, db: Session = Depends(get_db)):
    validate_school_email(req.email)

    # Duplicate checks
    if db.query(models.User).filter(models.User.email == req.email).first():
        raise HTTPException(status_code=400, detail="Email already registered.")
    if db.query(models.User).filter(models.User.username == req.username).first():
        raise HTTPException(status_code=400, detail="Username already taken.")

    user = models.User(
        name=req.name,
        username=req.username,
        email=req.email,
        hashed_password=hash_password(req.password),
        grade=req.grade,
        school=req.school,
        exam_target=req.exam_target,
        region=req.region,
        language=req.language,
        timezone=req.timezone,
    )
    db.add(user)
    db.flush()

    ensure_streak(db, user)
    ensure_theme(db, user)
    db.commit()
    db.refresh(user)

    token = create_access_token({"sub": user.id})
    return {
        "access_token": token,
        "token_type": "bearer",
        "user": user_to_dict(user, include_private=True),
    }


# ── LOGIN ─────────────────────────────────────────────────
@router.post("/login")
def login(
    form_data: OAuth2PasswordRequestForm = Depends(),
    db: Session = Depends(get_db),
):
    # Accept email or username in the `username` field
    identifier = form_data.username.strip().lower()
    user = (
        db.query(models.User)
        .filter(
            (models.User.email == identifier) |
            (models.User.username == identifier)
        )
        .first()
    )
    if not user or not verify_password(form_data.password, user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email/username or password.",
            headers={"WWW-Authenticate": "Bearer"},
        )
    if not user.is_active:
        raise HTTPException(status_code=403, detail="Account is deactivated.")

    # Update streak on login
    ensure_streak(db, user)
    ensure_theme(db, user)
    _update_streak(db, user)
    db.commit()
    db.refresh(user)

    token = create_access_token({"sub": user.id})
    return {
        "access_token": token,
        "token_type": "bearer",
        "user": user_to_dict(user, include_private=True),
    }


# ── ME (GET) ─────────────────────────────────────────────
@router.get("/me")
def get_me(current_user: models.User = Depends(get_current_user)):
    return user_to_dict(current_user, include_private=True)


# ── ME (UPDATE) ───────────────────────────────────────────
@router.put("/me")
def update_me(
    req: UpdateProfileRequest,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    if req.name is not None:
        current_user.name = req.name
    if req.bio is not None:
        current_user.bio = req.bio
    if req.grade is not None:
        current_user.grade = req.grade
    if req.school is not None:
        current_user.school = req.school
    if req.exam_target is not None:
        current_user.exam_target = req.exam_target
    if req.region is not None:
        current_user.region = req.region
    if req.language is not None:
        current_user.language = req.language
    if req.timezone is not None:
        current_user.timezone = req.timezone
    if req.subjects is not None:
        current_user.subjects = json.dumps(req.subjects)

    db.commit()
    db.refresh(current_user)
    return user_to_dict(current_user, include_private=True)


# ── CHANGE PASSWORD ───────────────────────────────────────
@router.put("/change-password")
def change_password(
    req: ChangePasswordRequest,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    if not verify_password(req.current_password, current_user.hashed_password):
        raise HTTPException(status_code=400, detail="Current password is incorrect.")
    current_user.hashed_password = hash_password(req.new_password)
    db.commit()
    return {"message": "Password updated successfully."}


# ── UPLOAD AVATAR ─────────────────────────────────────────
@router.post("/avatar")
def upload_avatar(
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    url = save_upload(file, "avatars", current_user.id)
    current_user.avatar_url = url
    db.commit()
    return {"avatar_url": url}


# ── UPLOAD COVER ──────────────────────────────────────────
@router.post("/cover")
def upload_cover(
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    url = save_upload(file, "covers", current_user.id)
    current_user.cover_url = url
    db.commit()
    return {"cover_url": url}


# ── STUDY STATUS ──────────────────────────────────────────
@router.put("/status")
def update_status(
    req: StudyStatusRequest,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    current_user.study_status = req.status
    if req.status == "studying":
        current_user.study_timer_start = datetime.now(timezone.utc)
    else:
        # Calculate study minutes for streak
        if current_user.study_timer_start and current_user.streak:
            elapsed = (
                datetime.now(timezone.utc) - current_user.study_timer_start
            ).total_seconds() / 60
            current_user.streak.total_study_mins += int(elapsed)
        current_user.study_timer_start = None
    db.commit()
    return {
        "study_status": current_user.study_status,
        "study_timer_start": (
            current_user.study_timer_start.isoformat()
            if current_user.study_timer_start else None
        ),
    }


# ── FOLLOW ────────────────────────────────────────────────
@router.post("/follow/{target_id}")
def follow_user(
    target_id: str,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    if target_id == current_user.id:
        raise HTTPException(status_code=400, detail="You cannot follow yourself.")

    target = db.query(models.User).filter(models.User.id == target_id).first()
    if not target:
        raise HTTPException(status_code=404, detail="User not found.")

    if target in current_user.following:
        raise HTTPException(status_code=400, detail="Already following this user.")

    current_user.following.append(target)
    create_notification(
        db, target_id, "follow",
        f"{current_user.name} started following you.",
        link=f"/profile/{current_user.username}",
    )
    db.commit()
    return {"message": f"Now following {target.name}."}


# ── UNFOLLOW ──────────────────────────────────────────────
@router.delete("/follow/{target_id}")
def unfollow_user(
    target_id: str,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    target = db.query(models.User).filter(models.User.id == target_id).first()
    if not target:
        raise HTTPException(status_code=404, detail="User not found.")
    if target not in current_user.following:
        raise HTTPException(status_code=400, detail="Not following this user.")

    current_user.following.remove(target)
    db.commit()
    return {"message": f"Unfollowed {target.name}."}


# ── GET USER BY ID/USERNAME ───────────────────────────────
@router.get("/users/{identifier}")
def get_user(
    identifier: str,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    user = (
        db.query(models.User)
        .filter(
            (models.User.id == identifier) |
            (models.User.username == identifier)
        )
        .first()
    )
    if not user:
        raise HTTPException(status_code=404, detail="User not found.")

    data = user_to_dict(user)
    data["is_following"] = user in current_user.following
    data["is_me"] = user.id == current_user.id
    return data


# ── SEARCH USERS ──────────────────────────────────────────
@router.get("/search")
def search_users(
    q: str = "",
    exam_target: Optional[str] = None,
    school: Optional[str] = None,
    limit: int = 20,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    query = db.query(models.User).filter(models.User.is_active == True)

    if q:
        like = f"%{q}%"
        query = query.filter(
            (models.User.name.ilike(like)) |
            (models.User.username.ilike(like)) |
            (models.User.school.ilike(like))
        )
    if exam_target:
        query = query.filter(models.User.exam_target == exam_target)
    if school:
        query = query.filter(models.User.school.ilike(f"%{school}%"))

    users = query.limit(limit).all()
    return [user_to_dict(u) for u in users]


# ── FOLLOWERS / FOLLOWING LISTS ───────────────────────────
@router.get("/users/{user_id}/followers")
def get_followers(
    user_id: str,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    user = db.query(models.User).filter(models.User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found.")
    return [user_to_dict(u) for u in user.followers_list]


@router.get("/users/{user_id}/following")
def get_following(
    user_id: str,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    user = db.query(models.User).filter(models.User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found.")
    return [user_to_dict(u) for u in user.following]


# ── NOTIFICATIONS ─────────────────────────────────────────
@router.get("/notifications")
def get_notifications(
    limit: int = 30,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    notifs = (
        db.query(models.Notification)
        .filter(models.Notification.user_id == current_user.id)
        .order_by(models.Notification.created_at.desc())
        .limit(limit)
        .all()
    )
    return [
        {
            "id": n.id,
            "type": n.type,
            "content": n.content,
            "link": n.link,
            "is_read": n.is_read,
            "created_at": n.created_at.isoformat(),
        }
        for n in notifs
    ]


@router.put("/notifications/read-all")
def mark_all_read(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    db.query(models.Notification).filter(
        models.Notification.user_id == current_user.id,
        models.Notification.is_read == False,
    ).update({"is_read": True})
    db.commit()
    return {"message": "All notifications marked as read."}


# ══════════════════════════════════════════════════════════
# INTERNAL HELPERS
# ══════════════════════════════════════════════════════════

def _update_streak(db: Session, user: models.User) -> None:
    """Update daily login streak."""
    streak = user.streak
    if not streak:
        return

    now = datetime.now(timezone.utc).date()
    last = streak.last_active_date.date() if streak.last_active_date else None

    if last is None:
        streak.current_streak = 1
    elif (now - last).days == 1:
        streak.current_streak += 1
    elif (now - last).days == 0:
        return  # Already logged in today
    else:
        streak.current_streak = 1  # Streak broken

    streak.longest_streak = max(streak.longest_streak, streak.current_streak)
    streak.last_active_date = datetime.now(timezone.utc)
