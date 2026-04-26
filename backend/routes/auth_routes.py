"""
auth_routes.py — Auth endpoints using JSON flat-file store
POST /api/auth/register
POST /api/auth/login
GET  /api/auth/me
PUT  /api/auth/me
POST /api/auth/follow/{user_id}
GET  /api/auth/search
GET  /api/auth/notifications
POST /api/auth/notifications/read
"""

import uuid
import json
from datetime import datetime, timezone
from typing import Optional, List

from fastapi import APIRouter, HTTPException, Depends, UploadFile, File, Form
from pydantic import BaseModel

import database as db
from auth import (
    hash_password, verify_password,
    create_access_token, get_current_user,
)

router = APIRouter()

# ── Schemas ───────────────────────────────────────────────

class RegisterRequest(BaseModel):
    name:         str
    email:        str
    username:     str
    password:     str
    grade:        Optional[str] = ""
    exam_target:  Optional[str] = ""
    school:       Optional[str] = ""
    language:     Optional[str] = "English"
    subjects:     Optional[List[str]] = []

class LoginRequest(BaseModel):
    identifier: str   # email OR username
    password:   str

class UpdateProfileRequest(BaseModel):
    name:         Optional[str] = None
    bio:          Optional[str] = None
    grade:        Optional[str] = None
    exam_target:  Optional[str] = None
    school:       Optional[str] = None
    language:     Optional[str] = None
    subjects:     Optional[List[str]] = None
    study_status: Optional[str] = None

# ── Helpers ───────────────────────────────────────────────

def _public_user(u: dict, current_id: str = None) -> dict:
    followers = db.find_many("follows", following_id=u["id"])
    following = db.find_many("follows", follower_id=u["id"])
    is_following     = False
    is_close_friend  = False
    if current_id:
        is_following    = db.exists("follows", follower_id=current_id, following_id=u["id"])
        is_close_friend = db.exists("close_friends", user_id=current_id, friend_id=u["id"])
    return {
        "id":           u["id"],
        "name":         u["name"],
        "username":     u["username"],
        "email":        u.get("email"),
        "avatar_url":   u.get("avatar_url"),
        "cover_url":    u.get("cover_url"),
        "bio":          u.get("bio"),
        "grade":        u.get("grade"),
        "school":       u.get("school"),
        "exam_target":  u.get("exam_target"),
        "subjects":     u.get("subjects", []),
        "study_status": u.get("study_status", ""),
        "role":         u.get("role", "student"),
        "is_verified":  u.get("is_verified", False),
        "help_points":  u.get("help_points", 0),
        "reputation":   u.get("reputation", 0),
        "followers_count": len(followers),
        "following_count": len(following),
        "is_following":    is_following,
        "is_close_friend": is_close_friend,
        "created_at":      u.get("created_at"),
    }

def _now() -> str:
    return datetime.now(timezone.utc).isoformat()

# ══════════════════════════════════════════════════════════
# REGISTER
# ══════════════════════════════════════════════════════════

@router.post("/register", status_code=201)
def register(req: RegisterRequest):
    # Validate
    if len(req.name.strip()) < 4:
        raise HTTPException(400, "Name must be at least 4 characters.")
    if len(req.password) < 6:
        raise HTTPException(400, "Password must be at least 6 characters.")
    if "@" not in req.email:
        raise HTTPException(400, "Invalid email address.")

    # Uniqueness
    if db.exists("users", email=req.email.lower().strip()):
        raise HTTPException(409, "Email already registered.")
    if db.exists("users", username=req.username.lower().strip()):
        raise HTTPException(409, "Username already taken.")

    user = {
        "id":             uuid.uuid4().hex,
        "name":           req.name.strip(),
        "email":          req.email.lower().strip(),
        "username":       req.username.lower().strip(),
        "hashed_password": hash_password(req.password),
        "grade":          req.grade or "",
        "exam_target":    req.exam_target or "",
        "school":         req.school or "",
        "language":       req.language or "English",
        "subjects":       req.subjects or [],
        "bio":            "",
        "avatar_url":     None,
        "cover_url":      None,
        "study_status":   "",
        "role":           "student",
        "is_verified":    False,
        "is_active":      True,
        "help_points":    0,
        "reputation":     0,
        "created_at":     _now(),
    }
    db.insert("users", user)

    token = create_access_token({"sub": user["id"]})
    return {"access_token": token, "token_type": "bearer", "user": _public_user(user)}

# ══════════════════════════════════════════════════════════
# LOGIN
# ══════════════════════════════════════════════════════════

@router.post("/login")
def login(req: LoginRequest):
    identifier = req.identifier.lower().strip()
    user = db.find_one("users", email=identifier) or \
           db.find_one("users", username=identifier)

    if not user or not verify_password(req.password, user["hashed_password"]):
        raise HTTPException(401, "Invalid credentials.")
    if not user.get("is_active", True):
        raise HTTPException(403, "Account is disabled.")

    token = create_access_token({"sub": user["id"]})
    return {"access_token": token, "token_type": "bearer", "user": _public_user(user)}

# ══════════════════════════════════════════════════════════
# ME
# ══════════════════════════════════════════════════════════

@router.get("/me")
def get_me(current_user: dict = Depends(get_current_user)):
    return _public_user(current_user, current_user["id"])

@router.put("/me")
def update_me(
    req: UpdateProfileRequest,
    current_user: dict = Depends(get_current_user),
):
    updates = {k: v for k, v in req.dict().items() if v is not None}
    updated = db.update_one("users", current_user["id"], updates)
    return _public_user(updated, current_user["id"])

# ══════════════════════════════════════════════════════════
# FOLLOW / UNFOLLOW
# ══════════════════════════════════════════════════════════

@router.post("/follow/{user_id}")
def toggle_follow(user_id: str, current_user: dict = Depends(get_current_user)):
    if user_id == current_user["id"]:
        raise HTTPException(400, "You cannot follow yourself.")

    target = db.find_one("users", id=user_id)
    if not target:
        raise HTTPException(404, "User not found.")

    existing = db.find_one("follows", follower_id=current_user["id"], following_id=user_id)
    if existing:
        db.delete_one("follows", existing["id"])
        return {"following": False}
    else:
        db.insert("follows", {
            "id":           uuid.uuid4().hex,
            "follower_id":  current_user["id"],
            "following_id": user_id,
            "created_at":   _now(),
        })
        # Notification
        db.insert("notifications", {
            "id":         uuid.uuid4().hex,
            "user_id":    user_id,
            "type":       "follow",
            "title":      "New follower",
            "message":    f"{current_user['name']} started following you.",
            "actor_id":   current_user["id"],
            "is_read":    False,
            "created_at": _now(),
        })
        return {"following": True}

# ══════════════════════════════════════════════════════════
# SEARCH USERS
# ══════════════════════════════════════════════════════════

@router.get("/search")
def search_users(q: str = "", limit: int = 10, current_user: dict = Depends(get_current_user)):
    if not q.strip():
        return []
    q_lower = q.lower()
    results = [
        u for u in db.find_all("users")
        if q_lower in u.get("name", "").lower()
        or q_lower in u.get("username", "").lower()
    ][:max(1, min(limit, 30))]
    return [_public_user(u, current_user["id"]) for u in results]

# ══════════════════════════════════════════════════════════
# CLOSE FRIENDS  (Instagram-style inner circle for stories)
# ══════════════════════════════════════════════════════════

@router.post("/close-friends/{user_id}")
def toggle_close_friend(user_id: str,
                        current_user: dict = Depends(get_current_user)):
    if user_id == current_user["id"]:
        raise HTTPException(400, "You cannot add yourself.")
    target = db.find_one("users", id=user_id)
    if not target:
        raise HTTPException(404, "User not found.")
    existing = db.find_one("close_friends",
                           user_id=current_user["id"], friend_id=user_id)
    if existing:
        db.delete_one("close_friends", existing["id"])
        return {"is_close_friend": False}
    db.insert("close_friends", {
        "id":         uuid.uuid4().hex,
        "user_id":    current_user["id"],
        "friend_id":  user_id,
        "created_at": _now(),
    })
    return {"is_close_friend": True}

@router.get("/close-friends")
def list_close_friends(current_user: dict = Depends(get_current_user)):
    rows = db.find_many("close_friends", user_id=current_user["id"])
    out = []
    for r in rows:
        u = db.find_one("users", id=r["friend_id"])
        if u:
            out.append(_public_user(u, current_user["id"]))
    return out

# ══════════════════════════════════════════════════════════
# NOTIFICATIONS
# ══════════════════════════════════════════════════════════

@router.get("/notifications")
def get_notifications(current_user: dict = Depends(get_current_user)):
    notifs = db.find_many("notifications", user_id=current_user["id"])
    notifs.sort(key=lambda n: n.get("created_at", ""), reverse=True)
    return notifs[:50]

@router.post("/notifications/read")
def mark_all_read(current_user: dict = Depends(get_current_user)):
    notifs = db.find_many("notifications", user_id=current_user["id"])
    for n in notifs:
        if not n.get("is_read"):
            db.update_one("notifications", n["id"], {"is_read": True})
    return {"message": "All notifications marked as read."}
