"""
profile_routes.py — Facebook-style Profile Backend
GET    /api/profile/{username}
GET    /api/profile/{username}/posts
GET    /api/profile/{username}/journey
GET    /api/profile/{username}/resources
GET    /api/profile/{username}/badges
POST   /api/profile/exam-countdowns
GET    /api/profile/exam-countdowns
DELETE /api/profile/exam-countdowns/{countdown_id}
GET    /api/profile/theme
PUT    /api/profile/theme
POST   /api/profile/theme/wallpaper
"""

import os
import json
import shutil
from datetime import datetime, timezone
from typing import Optional, List

from fastapi import (
    APIRouter, Depends, HTTPException,
    UploadFile, File, Form
)
from pydantic import BaseModel
from sqlalchemy.orm import Session
from sqlalchemy import desc

from database import get_db
from auth import get_current_user
import models

router = APIRouter()
UPLOAD_DIR = os.getenv("UPLOAD_DIR", "uploads")

# ── Preset wallpapers bundled with the app ────────────────
PRESET_WALLPAPERS = [
    {"id": "wp1",  "name": "Midnight Blue",   "url": "/static/wallpapers/midnight.jpg",   "type": "preset"},
    {"id": "wp2",  "name": "Aurora",          "url": "/static/wallpapers/aurora.jpg",     "type": "preset"},
    {"id": "wp3",  "name": "Deep Space",      "url": "/static/wallpapers/space.jpg",      "type": "preset"},
    {"id": "wp4",  "name": "Forest Mist",     "url": "/static/wallpapers/forest.jpg",     "type": "preset"},
    {"id": "wp5",  "name": "Golden Hour",     "url": "/static/wallpapers/golden.jpg",     "type": "preset"},
    {"id": "wp6",  "name": "Neon City",       "url": "/static/wallpapers/neon.jpg",       "type": "preset"},
    {"id": "wp7",  "name": "Cherry Blossom",  "url": "/static/wallpapers/sakura.jpg",     "type": "preset"},
    {"id": "wp8",  "name": "Mountain Snow",   "url": "/static/wallpapers/mountain.jpg",   "type": "preset"},
]

# ── Badge definitions ─────────────────────────────────────
BADGE_DEFINITIONS = [
    {"id": "b1",  "name": "First Step",       "icon": "🎯", "condition": "answered_first_question",    "description": "Answered your first question"},
    {"id": "b2",  "name": "Helping Hand",     "icon": "🤝", "condition": "help_points>=10",            "description": "Earned 10 help points"},
    {"id": "b3",  "name": "Problem Solver",   "icon": "🧠", "condition": "accepted_answers>=5",        "description": "Got 5 answers accepted"},
    {"id": "b4",  "name": "Streak Starter",   "icon": "🔥", "condition": "streak>=3",                  "description": "3-day study streak"},
    {"id": "b5",  "name": "Week Warrior",     "icon": "⚡", "condition": "streak>=7",                  "description": "7-day study streak"},
    {"id": "b6",  "name": "Month Master",     "icon": "👑", "condition": "streak>=30",                 "description": "30-day study streak"},
    {"id": "b7",  "name": "Resource Hero",    "icon": "📚", "condition": "uploads>=5",                 "description": "Uploaded 5 resources"},
    {"id": "b8",  "name": "Social Butterfly", "icon": "🦋", "condition": "followers>=10",              "description": "10 followers"},
    {"id": "b9",  "name": "Mentor Badge",     "icon": "🎓", "condition": "role==mentor",               "description": "Became a mentor"},
    {"id": "b10", "name": "Top Contributor",  "icon": "🏆", "condition": "reputation>=100",            "description": "Reached 100 reputation"},
    {"id": "b11", "name": "Scholar",          "icon": "📖", "condition": "reputation>=500",            "description": "Reached 500 reputation"},
    {"id": "b12", "name": "Guru",             "icon": "✨", "condition": "reputation>=1000",           "description": "Reached 1000 reputation"},
]


# ══════════════════════════════════════════════════════════
# SCHEMAS
# ══════════════════════════════════════════════════════════

class ExamCountdownCreate(BaseModel):
    exam_name: str
    exam_date: str      # ISO date string e.g. "2025-04-13"


class ThemeUpdate(BaseModel):
    theme: Optional[str] = None                  # dark | light | custom
    primary_color: Optional[str] = None          # hex
    accent_color: Optional[str] = None
    background_color: Optional[str] = None
    background_wallpaper: Optional[str] = None   # URL
    navbar_position: Optional[str] = None        # top | bottom | left
    font_size: Optional[str] = None              # small | medium | large
    animations: Optional[bool] = None
    statusbar_position: Optional[str] = None     # JSON string {"x":0,"y":0}


# ══════════════════════════════════════════════════════════
# FULL PROFILE
# ══════════════════════════════════════════════════════════

@router.get("/{username}")
def get_profile(
    username: str,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    """
    Full Facebook-style profile for a user.
    Includes: bio, stats, streak, badges, mutual connections.
    """
    user = (
        db.query(models.User)
        .filter(
            (models.User.username == username) |
            (models.User.id == username)
        )
        .first()
    )
    if not user:
        raise HTTPException(status_code=404, detail="User not found.")

    # Stats
    posts_count = db.query(models.Post).filter(
        models.Post.author_id == user.id
    ).count()

    questions_count = db.query(models.HelpRequest).filter(
        models.HelpRequest.author_id == user.id
    ).count()

    answers_count = db.query(models.Answer).filter(
        models.Answer.author_id == user.id
    ).count()

    accepted_answers = db.query(models.Answer).filter(
        models.Answer.author_id == user.id,
        models.Answer.is_accepted == True,
    ).count()

    resources_count = db.query(models.Resource).filter(
        models.Resource.uploader_id == user.id
    ).count()

    followers_count = len(user.followers_list)
    following_count = len(user.following)

    # Mutual followers (people both follow)
    current_following_ids = {u.id for u in current_user.following}
    target_following_ids  = {u.id for u in user.following}
    mutual_ids = current_following_ids & target_following_ids
    mutuals = [
        {
            "id": u.id,
            "name": u.name,
            "username": u.username,
            "avatar_url": u.avatar_url,
        }
        for u in db.query(models.User).filter(
            models.User.id.in_(list(mutual_ids)[:5])
        ).all()
    ]

    # Badges earned
    badges = _compute_badges(user, db)

    # Exam countdowns
    now = datetime.now(timezone.utc)
    countdowns = [
        {
            "id": c.id,
            "exam_name": c.exam_name,
            "exam_date": c.exam_date.isoformat(),
            "days_remaining": max(0, (c.exam_date.replace(tzinfo=timezone.utc) - now).days),
        }
        for c in user.exam_countdowns
        if c.exam_date.replace(tzinfo=timezone.utc) >= now
    ]

    return {
        "id": user.id,
        "name": user.name,
        "username": user.username,
        "avatar_url": user.avatar_url,
        "cover_url": user.cover_url,
        "bio": user.bio,
        "grade": user.grade,
        "school": user.school,
        "region": user.region,
        "language": user.language,
        "timezone": user.timezone,
        "exam_target": user.exam_target,
        "subjects": json.loads(user.subjects) if user.subjects else [],
        "study_status": user.study_status,
        "role": user.role,
        "is_verified": user.is_verified,
        "created_at": user.created_at.isoformat(),
        "is_me": user.id == current_user.id,
        "is_following": user in current_user.following,
        "is_followed_by": current_user in user.following,
        "stats": {
            "posts": posts_count,
            "questions": questions_count,
            "answers": answers_count,
            "accepted_answers": accepted_answers,
            "resources": resources_count,
            "followers": followers_count,
            "following": following_count,
            "help_points": user.help_points,
            "reputation": user.reputation,
        },
        "streak": {
            "current": user.streak.current_streak if user.streak else 0,
            "longest": user.streak.longest_streak if user.streak else 0,
            "total_study_mins": user.streak.total_study_mins if user.streak else 0,
        },
        "badges": badges,
        "exam_countdowns": countdowns,
        "mutual_connections": mutuals,
        "mutual_count": len(mutual_ids),
        "has_mentor_profile": user.mentor_profile is not None,
        "mentor_profile_id": user.mentor_profile.id if user.mentor_profile else None,
    }


# ══════════════════════════════════════════════════════════
# PROFILE TABS
# ══════════════════════════════════════════════════════════

@router.get("/{username}/posts")
def get_profile_posts(
    username: str,
    page: int = 1,
    limit: int = 12,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    user = _get_user_or_404(username, db)
    total = db.query(models.Post).filter(
        models.Post.author_id == user.id
    ).count()

    posts = (
        db.query(models.Post)
        .filter(models.Post.author_id == user.id)
        .order_by(desc(models.Post.created_at))
        .offset((page - 1) * limit)
        .limit(limit)
        .all()
    )

    from routes.feed_routes import serialize_post
    return {
        "posts": [serialize_post(p, current_user) for p in posts],
        "total": total,
        "page": page,
        "pages": (total + limit - 1) // limit,
    }


@router.get("/{username}/journey")
def get_profile_journey(
    username: str,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    user = _get_user_or_404(username, db)
    journeys = (
        db.query(models.JourneyPost)
        .filter(models.JourneyPost.author_id == user.id)
        .order_by(desc(models.JourneyPost.week_number))
        .all()
    )

    return [
        {
            "id": j.id,
            "week_number": j.week_number,
            "mock_score": j.mock_score,
            "topics_done": json.loads(j.topics_done) if j.topics_done else [],
            "reflection": j.reflection,
            "goals_next": j.goals_next,
            "created_at": j.created_at.isoformat(),
        }
        for j in journeys
    ]


@router.get("/{username}/resources")
def get_profile_resources(
    username: str,
    page: int = 1,
    limit: int = 12,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    user = _get_user_or_404(username, db)
    total = db.query(models.Resource).filter(
        models.Resource.uploader_id == user.id
    ).count()

    resources = (
        db.query(models.Resource)
        .filter(models.Resource.uploader_id == user.id)
        .order_by(desc(models.Resource.created_at))
        .offset((page - 1) * limit)
        .limit(limit)
        .all()
    )

    from routes.resource_routes import serialize_resource
    return {
        "resources": [serialize_resource(r, current_user) for r in resources],
        "total": total,
        "page": page,
        "pages": (total + limit - 1) // limit,
    }


@router.get("/{username}/badges")
def get_profile_badges(
    username: str,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    user = _get_user_or_404(username, db)
    return _compute_badges(user, db)


# ══════════════════════════════════════════════════════════
# EXAM COUNTDOWNS
# ══════════════════════════════════════════════════════════

@router.post("/exam-countdowns", status_code=201)
def add_countdown(
    req: ExamCountdownCreate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    try:
        exam_date = datetime.fromisoformat(req.exam_date)
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid date format. Use YYYY-MM-DD.")

    if exam_date < datetime.now():
        raise HTTPException(status_code=400, detail="Exam date must be in the future.")

    # Max 5 countdowns per user
    existing = db.query(models.ExamCountdown).filter(
        models.ExamCountdown.user_id == current_user.id
    ).count()
    if existing >= 5:
        raise HTTPException(
            status_code=400,
            detail="Maximum 5 exam countdowns allowed. Delete one first."
        )

    countdown = models.ExamCountdown(
        user_id=current_user.id,
        exam_name=req.exam_name.strip(),
        exam_date=exam_date,
    )
    db.add(countdown)
    db.commit()
    db.refresh(countdown)

    now = datetime.now(timezone.utc)
    return {
        "id": countdown.id,
        "exam_name": countdown.exam_name,
        "exam_date": countdown.exam_date.isoformat(),
        "days_remaining": max(0, (countdown.exam_date.replace(tzinfo=timezone.utc) - now).days),
    }


@router.get("/exam-countdowns")
def get_countdowns(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    now = datetime.now(timezone.utc)
    countdowns = (
        db.query(models.ExamCountdown)
        .filter(models.ExamCountdown.user_id == current_user.id)
        .order_by(models.ExamCountdown.exam_date)
        .all()
    )
    return [
        {
            "id": c.id,
            "exam_name": c.exam_name,
            "exam_date": c.exam_date.isoformat(),
            "days_remaining": max(
                0,
                (c.exam_date.replace(tzinfo=timezone.utc) - now).days
            ),
        }
        for c in countdowns
    ]


@router.delete("/exam-countdowns/{countdown_id}")
def delete_countdown(
    countdown_id: str,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    c = db.query(models.ExamCountdown).filter(
        models.ExamCountdown.id == countdown_id,
        models.ExamCountdown.user_id == current_user.id,
    ).first()
    if not c:
        raise HTTPException(status_code=404, detail="Countdown not found.")
    db.delete(c)
    db.commit()
    return {"message": "Countdown deleted."}


# ══════════════════════════════════════════════════════════
# THEME / CUSTOMIZATION
# ══════════════════════════════════════════════════════════

@router.get("/theme")
def get_theme(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    t = current_user.theme_settings
    if not t:
        # Return defaults
        return _default_theme()
    return _serialize_theme(t)


@router.put("/theme")
def update_theme(
    req: ThemeUpdate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    t = current_user.theme_settings
    if not t:
        t = models.ThemeSettings(user_id=current_user.id)
        db.add(t)
        db.flush()

    valid_themes   = {"dark", "light", "custom"}
    valid_navbar   = {"top", "bottom", "left"}
    valid_font     = {"small", "medium", "large"}

    if req.theme is not None:
        if req.theme not in valid_themes:
            raise HTTPException(status_code=400, detail=f"Theme must be one of {valid_themes}")
        t.theme = req.theme

    if req.primary_color is not None:
        if not _valid_hex(req.primary_color):
            raise HTTPException(status_code=400, detail="Invalid hex color for primary_color.")
        t.primary_color = req.primary_color

    if req.accent_color is not None:
        if not _valid_hex(req.accent_color):
            raise HTTPException(status_code=400, detail="Invalid hex color for accent_color.")
        t.accent_color = req.accent_color

    if req.background_color is not None:
        if not _valid_hex(req.background_color):
            raise HTTPException(status_code=400, detail="Invalid hex color.")
        t.background_color = req.background_color

    if req.background_wallpaper is not None:
        t.background_wallpaper = req.background_wallpaper

    if req.navbar_position is not None:
        if req.navbar_position not in valid_navbar:
            raise HTTPException(status_code=400, detail=f"navbar_position must be one of {valid_navbar}")
        t.navbar_position = req.navbar_position

    if req.font_size is not None:
        if req.font_size not in valid_font:
            raise HTTPException(status_code=400, detail=f"font_size must be one of {valid_font}")
        t.font_size = req.font_size

    if req.animations is not None:
        t.animations = req.animations

    if req.statusbar_position is not None:
        t.statusbar_position = req.statusbar_position

    db.commit()
    db.refresh(t)
    return _serialize_theme(t)


@router.post("/theme/wallpaper")
def upload_wallpaper(
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    allowed = {".jpg", ".jpeg", ".png", ".webp", ".gif"}
    ext = os.path.splitext(file.filename)[-1].lower()
    if ext not in allowed:
        raise HTTPException(
            status_code=400,
            detail="Wallpaper must be JPG, PNG, WEBP, or GIF."
        )

    fname = f"wallpaper_{current_user.id}{ext}"
    path = os.path.join(UPLOAD_DIR, "wallpapers", fname)
    with open(path, "wb") as out:
        shutil.copyfileobj(file.file, out)

    url = f"/uploads/wallpapers/{fname}"

    # Auto-apply
    t = current_user.theme_settings
    if not t:
        t = models.ThemeSettings(user_id=current_user.id)
        db.add(t)
    t.background_wallpaper = url
    db.commit()

    return {
        "wallpaper_url": url,
        "preset_wallpapers": PRESET_WALLPAPERS,
    }


@router.get("/theme/wallpapers")
def list_wallpapers(
    current_user: models.User = Depends(get_current_user),
):
    """Returns preset wallpapers + user's custom one if set."""
    custom = []
    if current_user.theme_settings and current_user.theme_settings.background_wallpaper:
        wp = current_user.theme_settings.background_wallpaper
        if "/uploads/wallpapers/" in wp:
            custom = [{"id": "custom", "name": "My Wallpaper", "url": wp, "type": "custom"}]
    return PRESET_WALLPAPERS + custom


# ══════════════════════════════════════════════════════════
# INTERNAL HELPERS
# ══════════════════════════════════════════════════════════

def _get_user_or_404(identifier: str, db: Session) -> models.User:
    user = db.query(models.User).filter(
        (models.User.username == identifier) |
        (models.User.id == identifier)
    ).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found.")
    return user


def _valid_hex(color: str) -> bool:
    import re
    return bool(re.match(r"^#[0-9A-Fa-f]{6}$", color))


def _serialize_theme(t: models.ThemeSettings) -> dict:
    return {
        "theme": t.theme,
        "primary_color": t.primary_color,
        "accent_color": t.accent_color,
        "background_color": t.background_color,
        "background_wallpaper": t.background_wallpaper,
        "navbar_position": t.navbar_position,
        "font_size": t.font_size,
        "animations": t.animations,
        "statusbar_position": json.loads(t.statusbar_position) if t.statusbar_position else {"x": 0, "y": 0},
    }


def _default_theme() -> dict:
    return {
        "theme": "dark",
        "primary_color": "#6366f1",
        "accent_color": "#f59e0b",
        "background_color": "#0f0f1a",
        "background_wallpaper": None,
        "navbar_position": "bottom",
        "font_size": "medium",
        "animations": True,
        "statusbar_position": {"x": 0, "y": 0},
    }


def _compute_badges(user: models.User, db: Session) -> list:
    """
    Computes which badges a user has earned based on their stats.
    Returns list of badge dicts with earned=True/False.
    """
    streak = user.streak.current_streak if user.streak else 0
    longest = user.streak.longest_streak if user.streak else 0
    help_pts = user.help_points
    rep = user.reputation
    followers = len(user.followers_list)
    role = user.role

    uploads = db.query(models.Resource).filter(
        models.Resource.uploader_id == user.id
    ).count()

    accepted = db.query(models.Answer).filter(
        models.Answer.author_id == user.id,
        models.Answer.is_accepted == True,
    ).count()

    answers_total = db.query(models.Answer).filter(
        models.Answer.author_id == user.id
    ).count()

    earned = []
    for b in BADGE_DEFINITIONS:
        cond = b["condition"]
        is_earned = False

        if cond == "answered_first_question":
            is_earned = answers_total >= 1
        elif cond.startswith("help_points>="):
            is_earned = help_pts >= int(cond.split(">=")[1])
        elif cond.startswith("accepted_answers>="):
            is_earned = accepted >= int(cond.split(">=")[1])
        elif cond.startswith("streak>="):
            is_earned = longest >= int(cond.split(">=")[1])
        elif cond.startswith("uploads>="):
            is_earned = uploads >= int(cond.split(">=")[1])
        elif cond.startswith("followers>="):
            is_earned = followers >= int(cond.split(">=")[1])
        elif cond == "role==mentor":
            is_earned = role == "mentor"
        elif cond.startswith("reputation>="):
            is_earned = rep >= int(cond.split(">=")[1])

        earned.append({**b, "earned": is_earned})

    return earned
