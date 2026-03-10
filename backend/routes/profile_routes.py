"""profile_routes.py — User profiles, avatars, themes (JSON store)"""
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

def _save_upload(file, subfolder):
    ext = os.path.splitext(file.filename)[-1].lower() or ".jpg"
    fname = f"{uuid.uuid4().hex}{ext}"
    folder = os.path.join(UPLOAD_DIR, subfolder)
    os.makedirs(folder, exist_ok=True)
    with open(os.path.join(folder, fname), "wb") as out:
        shutil.copyfileobj(file.file, out)
    return f"/uploads/{subfolder}/{fname}"

def _build_profile(u, cu):
    posts      = db.find_many("posts", author_id=u["id"])
    followers  = db.find_many("follows", following_id=u["id"])
    following  = db.find_many("follows", follower_id=u["id"])
    is_following = db.exists("follows", follower_id=cu["id"], following_id=u["id"])
    badges     = db.find_many("badges", user_id=u["id"])
    theme      = db.find_one("user_themes", user_id=u["id"])
    mentor     = db.find_one("mentor_profiles", user_id=u["id"])
    countdowns = db.find_many("exam_countdowns", user_id=u["id"])
    streak_rec = db.find_one("streaks", user_id=u["id"])
    return {
        "id": u["id"], "name": u["name"], "username": u["username"],
        "email": u.get("email") if u["id"] == cu["id"] else None,
        "avatar_url": u.get("avatar_url"), "cover_url": u.get("cover_url"),
        "bio": u.get("bio",""), "grade": u.get("grade",""),
        "school": u.get("school",""), "exam_target": u.get("exam_target",""),
        "subjects": u.get("subjects",[]), "study_status": u.get("study_status",""),
        "language": u.get("language","English"),
        "role": u.get("role","student"), "is_verified": u.get("is_verified",False),
        "help_points": u.get("help_points",0), "reputation": u.get("reputation",0),
        "posts_count": len(posts),
        "followers_count": len(followers), "following_count": len(following),
        "is_following": is_following, "is_mine": u["id"] == cu["id"],
        "badges": badges, "theme": theme,
        "mentor_profile": {"id": mentor["id"]} if mentor else None,
        "exam_countdowns": countdowns,
        "streak": streak_rec.get("current_streak",0) if streak_rec else 0,
        "created_at": u.get("created_at"),
    }

@router.get("/{username}")
def get_profile(username: str, current_user: dict=Depends(get_current_user)):
    u = db.find_one("users", username=username)
    if not u: raise HTTPException(404, "User not found.")
    return _build_profile(u, current_user)

@router.get("/{username}/posts")
def get_user_posts(username: str, page: int=1, limit: int=12,
                   current_user: dict=Depends(get_current_user)):
    u = db.find_one("users", username=username)
    if not u: raise HTTPException(404)
    posts = sorted([p for p in db.find_many("posts", author_id=u["id"]) if not p.get("is_anonymous")],
                   key=lambda p: p["created_at"], reverse=True)
    total = len(posts)
    from routes.feed_routes import _serialize_post
    return {"posts": [_serialize_post(p, current_user) for p in posts[(page-1)*limit:page*limit]],
            "total": total, "has_more": page*limit < total}

@router.post("/avatar")
async def upload_avatar(avatar: UploadFile=File(...), current_user: dict=Depends(get_current_user)):
    url = _save_upload(avatar, "avatars")
    db.update_one("users", current_user["id"], {"avatar_url": url})
    return {"avatar_url": url}

@router.post("/cover")
async def upload_cover(cover: UploadFile=File(...), current_user: dict=Depends(get_current_user)):
    url = _save_upload(cover, "covers")
    db.update_one("users", current_user["id"], {"cover_url": url})
    return {"cover_url": url}

# ── THEME ─────────────────────────────────────────────────
class ThemeUpdate(BaseModel):
    base_theme:    Optional[str] = None
    accent_color:  Optional[str] = None
    wallpaper_url: Optional[str] = None
    font_size:     Optional[str] = None
    compact_mode:  Optional[bool] = None

@router.get("/theme/me")
def get_theme(current_user: dict=Depends(get_current_user)):
    theme = db.find_one("user_themes", user_id=current_user["id"])
    return theme or {"base_theme":"dark","accent_color":"blue","wallpaper_url":None,"font_size":"medium","compact_mode":False}

@router.put("/theme/me")
def update_theme(req: ThemeUpdate, current_user: dict=Depends(get_current_user)):
    updates = {k: v for k,v in req.dict().items() if v is not None}
    existing = db.find_one("user_themes", user_id=current_user["id"])
    if existing:
        return db.update_one("user_themes", existing["id"], updates)
    theme = {"id": uuid.uuid4().hex, "user_id": current_user["id"],
             "base_theme": "dark", "accent_color": "blue",
             "wallpaper_url": None, "font_size": "medium", "compact_mode": False,
             **updates, "created_at": _now()}
    db.insert("user_themes", theme)
    return theme

# ── EXAM COUNTDOWNS ───────────────────────────────────────
class CountdownCreate(BaseModel):
    exam_name: str; exam_date: str; notes: Optional[str]=None

@router.get("/countdowns/me")
def get_countdowns(current_user: dict=Depends(get_current_user)):
    return db.find_many("exam_countdowns", user_id=current_user["id"])

@router.post("/countdowns/me", status_code=201)
def add_countdown(req: CountdownCreate, current_user: dict=Depends(get_current_user)):
    c = {"id": uuid.uuid4().hex, "user_id": current_user["id"],
         "exam_name": req.exam_name, "exam_date": req.exam_date,
         "notes": req.notes, "created_at": _now()}
    db.insert("exam_countdowns", c)
    return c

@router.delete("/countdowns/{countdown_id}")
def delete_countdown(countdown_id: str, current_user: dict=Depends(get_current_user)):
    c = db.find_one("exam_countdowns", id=countdown_id)
    if not c: raise HTTPException(404)
    if c["user_id"] != current_user["id"]: raise HTTPException(403)
    db.delete_one("exam_countdowns", countdown_id)
    return {"message": "Deleted."}

# ── FOLLOWERS ─────────────────────────────────────────────
@router.get("/{username}/followers")
def get_followers(username: str, current_user: dict=Depends(get_current_user)):
    u = db.find_one("users", username=username)
    if not u: raise HTTPException(404)
    follows = db.find_many("follows", following_id=u["id"])
    result = []
    for f in follows:
        follower = db.find_one("users", id=f["follower_id"])
        if follower:
            result.append({"id": follower["id"], "name": follower["name"],
                           "username": follower["username"], "avatar_url": follower.get("avatar_url"),
                           "is_following": db.exists("follows", follower_id=current_user["id"], following_id=follower["id"])})
    return result

@router.get("/{username}/following")
def get_following(username: str, current_user: dict=Depends(get_current_user)):
    u = db.find_one("users", username=username)
    if not u: raise HTTPException(404)
    follows = db.find_many("follows", follower_id=u["id"])
    result = []
    for f in follows:
        target = db.find_one("users", id=f["following_id"])
        if target:
            result.append({"id": target["id"], "name": target["name"],
                           "username": target["username"], "avatar_url": target.get("avatar_url"),
                           "is_following": db.exists("follows", follower_id=current_user["id"], following_id=target["id"])})
    return result
