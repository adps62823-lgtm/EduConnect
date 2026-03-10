"""gamification_routes.py — Leaderboard, streaks, badges, check-in (JSON store)"""
import uuid
from datetime import datetime, timezone, timedelta, date
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
import database as db
from auth import get_current_user

router = APIRouter()
def _now(): return datetime.now(timezone.utc).isoformat()
def _today(): return date.today().isoformat()

# ── LEADERBOARD ───────────────────────────────────────────
@router.get("/leaderboard")
def get_leaderboard(scope: str="weekly", limit: int=50,
                    current_user: dict=Depends(get_current_user)):
    users = db.find_all("users")
    if scope == "weekly":
        cutoff = (datetime.now(timezone.utc) - timedelta(days=7)).isoformat()
        def score(u):
            posts = len([p for p in db.find_many("posts", author_id=u["id"]) if p["created_at"] >= cutoff])
            answers = len([a for a in db.find_many("answers", author_id=u["id"]) if a["created_at"] >= cutoff])
            return posts*2 + answers*3 + u.get("reputation",0)
    elif scope == "monthly":
        cutoff = (datetime.now(timezone.utc) - timedelta(days=30)).isoformat()
        def score(u):
            posts = len([p for p in db.find_many("posts", author_id=u["id"]) if p["created_at"] >= cutoff])
            answers = len([a for a in db.find_many("answers", author_id=u["id"]) if a["created_at"] >= cutoff])
            return posts*2 + answers*3 + u.get("reputation",0)
    else:  # all-time
        def score(u): return u.get("reputation",0) + u.get("help_points",0)

    ranked = sorted(users, key=score, reverse=True)[:limit]
    result = []
    for i, u in enumerate(ranked):
        streak = db.find_one("streaks", user_id=u["id"])
        result.append({"rank": i+1, "id": u["id"], "name": u["name"],
                       "username": u["username"], "avatar_url": u.get("avatar_url"),
                       "grade": u.get("grade"), "exam_target": u.get("exam_target"),
                       "score": score(u), "reputation": u.get("reputation",0),
                       "help_points": u.get("help_points",0),
                       "streak": streak.get("current_streak",0) if streak else 0,
                       "is_me": u["id"] == current_user["id"]})
    return result

# ── STREAK ────────────────────────────────────────────────
@router.get("/streak")
def get_streak(current_user: dict=Depends(get_current_user)):
    streak = db.find_one("streaks", user_id=current_user["id"])
    if not streak:
        return {"current_streak":0,"longest_streak":0,"last_activity_date":None,"calendar":[]}
    # Build last 30-day calendar
    calendar = []
    today = date.today()
    for i in range(29, -1, -1):
        d = (today - timedelta(days=i)).isoformat()
        calendar.append({"date": d, "active": d in (streak.get("activity_dates") or [])})
    return {**streak, "calendar": calendar}

@router.post("/checkin")
def daily_checkin(current_user: dict=Depends(get_current_user)):
    today = _today()
    streak = db.find_one("streaks", user_id=current_user["id"])
    if not streak:
        streak = {"id": uuid.uuid4().hex, "user_id": current_user["id"],
                  "current_streak": 1, "longest_streak": 1,
                  "last_activity_date": today,
                  "activity_dates": [today], "created_at": _now()}
        db.insert("streaks", streak)
        db.update_one("users", current_user["id"], {"help_points": current_user.get("help_points",0)+1})
        return {"streak": 1, "points_earned": 1, "message": "First check-in! 🎉"}

    last = streak.get("last_activity_date","")
    if last == today:
        return {"streak": streak["current_streak"], "points_earned": 0, "message": "Already checked in today."}

    yesterday = (date.today() - timedelta(days=1)).isoformat()
    if last == yesterday:
        new_streak = streak["current_streak"] + 1
        longest = max(new_streak, streak.get("longest_streak",0))
    else:
        new_streak = 1
        longest = streak.get("longest_streak",0)

    activity_dates = streak.get("activity_dates",[])
    if today not in activity_dates: activity_dates.append(today)
    # Keep only last 60 days
    activity_dates = sorted(activity_dates)[-60:]

    db.update_one("streaks", streak["id"], {"current_streak": new_streak, "longest_streak": longest,
                                             "last_activity_date": today, "activity_dates": activity_dates})
    points_earned = 1 + (2 if new_streak % 7 == 0 else 0)  # bonus on 7-day multiples
    db.update_one("users", current_user["id"], {"help_points": current_user.get("help_points",0)+points_earned})
    msg = f"🔥 {new_streak} day streak!" if new_streak > 1 else "Day 1 — keep it up!"
    return {"streak": new_streak, "points_earned": points_earned, "message": msg}

# ── BADGES ────────────────────────────────────────────────
BADGE_CRITERIA = [
    {"key": "first_post",    "name": "First Post",       "icon": "📝", "desc": "Published your first post"},
    {"key": "helpful",       "name": "Helpful",          "icon": "🤝", "desc": "Had an answer accepted"},
    {"key": "scholar",       "name": "Scholar",          "icon": "🎓", "desc": "10+ reputation"},
    {"key": "streak_7",      "name": "Week Warrior",     "icon": "🔥", "desc": "7-day study streak"},
    {"key": "streak_30",     "name": "Monthly Master",   "icon": "💎", "desc": "30-day study streak"},
    {"key": "resource_hero", "name": "Resource Hero",    "icon": "📚", "desc": "Uploaded 3+ resources"},
    {"key": "mentor",        "name": "Mentor",           "icon": "🏫", "desc": "Became a mentor"},
    {"key": "popular",       "name": "Popular",          "icon": "⭐", "desc": "Post got 10+ likes"},
]

def _award_badges(user_id: str):
    u = db.find_one("users", id=user_id)
    if not u: return
    earned = {b["key"] for b in db.find_many("badges", user_id=user_id)}
    new_badges = []

    def award(key):
        if key not in earned:
            bd = next((b for b in BADGE_CRITERIA if b["key"] == key), None)
            if bd:
                badge = {**bd, "id": uuid.uuid4().hex, "user_id": user_id, "earned_at": _now()}
                db.insert("badges", badge)
                new_badges.append(badge)

    if db.find_many("posts", author_id=user_id):           award("first_post")
    if db.find_one("answers", author_id=user_id, is_accepted=True): award("helpful")
    if u.get("reputation",0) >= 10:                        award("scholar")
    streak = db.find_one("streaks", user_id=user_id)
    if streak:
        if streak.get("current_streak",0) >= 7:  award("streak_7")
        if streak.get("current_streak",0) >= 30: award("streak_30")
    if len(db.find_many("resources", uploader_id=user_id)) >= 3: award("resource_hero")
    if db.find_one("mentor_profiles", user_id=user_id):    award("mentor")
    for p in db.find_many("posts", author_id=user_id):
        if len(db.find_many("post_likes", post_id=p["id"])) >= 10:
            award("popular"); break
    return new_badges

@router.post("/badges/check")
def check_badges(current_user: dict=Depends(get_current_user)):
    new = _award_badges(current_user["id"])
    all_badges = db.find_many("badges", user_id=current_user["id"])
    return {"new_badges": new or [], "all_badges": all_badges}

@router.get("/badges/{user_id}")
def get_user_badges(user_id: str, current_user: dict=Depends(get_current_user)):
    return db.find_many("badges", user_id=user_id)

# ── STREAK WARS ───────────────────────────────────────────
@router.get("/streak-wars")
def streak_wars(current_user: dict=Depends(get_current_user)):
    """Return users sorted by current streak — friendly competition."""
    users = db.find_all("users")
    result = []
    for u in users:
        s = db.find_one("streaks", user_id=u["id"])
        if s and s.get("current_streak",0) > 0:
            result.append({"id": u["id"], "name": u["name"], "username": u["username"],
                           "avatar_url": u.get("avatar_url"),
                           "current_streak": s.get("current_streak",0),
                           "longest_streak": s.get("longest_streak",0),
                           "is_me": u["id"] == current_user["id"]})
    result.sort(key=lambda x: x["current_streak"], reverse=True)
    return result[:50]

# ── MY STATS ──────────────────────────────────────────────
@router.get("/stats/me")
def my_stats(current_user: dict=Depends(get_current_user)):
    uid = current_user["id"]
    posts      = db.find_many("posts",    author_id=uid)
    answers    = db.find_many("answers",  author_id=uid)
    resources  = db.find_many("resources", uploader_id=uid)
    questions  = db.find_many("questions", author_id=uid)
    followers  = db.find_many("follows",  following_id=uid)
    following  = db.find_many("follows",  follower_id=uid)
    badges     = db.find_many("badges",   user_id=uid)
    streak     = db.find_one("streaks",   user_id=uid)
    total_likes = sum(len(db.find_many("post_likes", post_id=p["id"])) for p in posts)
    return {
        "posts_count": len(posts), "answers_count": len(answers),
        "questions_count": len(questions), "resources_count": len(resources),
        "followers_count": len(followers), "following_count": len(following),
        "badges_count": len(badges), "total_likes_received": total_likes,
        "reputation": current_user.get("reputation",0),
        "help_points": current_user.get("help_points",0),
        "current_streak": streak.get("current_streak",0) if streak else 0,
        "longest_streak": streak.get("longest_streak",0) if streak else 0,
    }
