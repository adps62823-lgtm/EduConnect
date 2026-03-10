"""
gamification_routes.py — Streaks, Streak Wars & Leaderboards
GET    /api/gamification/leaderboard
GET    /api/gamification/streaks/me
POST   /api/gamification/streaks/checkin
GET    /api/gamification/streak-wars
POST   /api/gamification/streak-wars
GET    /api/gamification/streak-wars/{war_id}
POST   /api/gamification/streak-wars/{war_id}/join/{team}
GET    /api/gamification/badges
GET    /api/gamification/badges/me
POST   /api/gamification/badges/check        ← auto-award new badges
GET    /api/gamification/stats/school
"""

import json
from datetime import datetime, timezone, timedelta
from typing import Optional, List

from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel, field_validator
from sqlalchemy.orm import Session
from sqlalchemy import desc, func, and_

from database import get_db
from auth import get_current_user, create_notification
import models

router = APIRouter()


# ══════════════════════════════════════════════════════════
# SCHEMAS
# ══════════════════════════════════════════════════════════

class StreakWarCreate(BaseModel):
    name: str
    war_type: str               # "class" | "school"
    team_a: str
    team_b: str
    duration_days: int = 7

    @field_validator("war_type")
    @classmethod
    def valid_type(cls, v):
        if v not in ("class", "school"):
            raise ValueError("war_type must be 'class' or 'school'.")
        return v

    @field_validator("duration_days")
    @classmethod
    def valid_duration(cls, v):
        if not (1 <= v <= 30):
            raise ValueError("Duration must be 1–30 days.")
        return v


# ══════════════════════════════════════════════════════════
# LEADERBOARD
# ══════════════════════════════════════════════════════════

@router.get("/leaderboard")
def get_leaderboard(
    scope: str = "global",          # global | school | class | stream
    period: str = "weekly",         # weekly | monthly | alltime
    metric: str = "streak",         # streak | helppoints | reputation | studymins
    school: Optional[str] = None,
    exam_target: Optional[str] = None,
    grade: Optional[str] = None,
    limit: int = 50,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    """
    Multi-dimensional leaderboard:
    - scope: filter who's included
    - metric: what we rank by
    - period: time window (streak resets don't affect alltime longest)
    """
    query = (
        db.query(models.User)
        .filter(models.User.is_active == True)
    )

    # Scope filters
    if scope == "school" or school:
        target_school = school or current_user.school
        if target_school:
            query = query.filter(models.User.school.ilike(f"%{target_school}%"))
    if scope == "class" or grade:
        target_grade = grade or current_user.grade
        if target_grade:
            query = query.filter(models.User.grade == target_grade)
    if scope == "stream" or exam_target:
        target_stream = exam_target or current_user.exam_target
        if target_stream:
            query = query.filter(models.User.exam_target == target_stream)

    users = query.all()

    # Build ranked entries
    entries = []
    for u in users:
        streak = u.streak

        if metric == "streak":
            if period == "alltime":
                score = streak.longest_streak if streak else 0
            else:
                score = streak.current_streak if streak else 0
        elif metric == "helppoints":
            score = u.help_points
        elif metric == "reputation":
            score = u.reputation
        elif metric == "studymins":
            score = streak.total_study_mins if streak else 0
        else:
            score = streak.current_streak if streak else 0

        entries.append({
            "user": {
                "id": u.id,
                "name": u.name,
                "username": u.username,
                "avatar_url": u.avatar_url,
                "school": u.school,
                "grade": u.grade,
                "exam_target": u.exam_target,
                "study_status": u.study_status,
                "is_me": u.id == current_user.id,
            },
            "score": score,
            "current_streak": streak.current_streak if streak else 0,
            "longest_streak": streak.longest_streak if streak else 0,
            "help_points": u.help_points,
            "reputation": u.reputation,
            "total_study_mins": streak.total_study_mins if streak else 0,
        })

    # Sort by score descending
    entries.sort(key=lambda e: -e["score"])
    entries = entries[:limit]

    # Add rank numbers
    for i, e in enumerate(entries):
        e["rank"] = i + 1

    # Find current user's rank (if not in top N)
    my_rank = next((e["rank"] for e in entries if e["user"]["is_me"]), None)
    if my_rank is None:
        # Calculate full rank
        all_entries_sorted = sorted(
            [
                {
                    "user_id": u.id,
                    "score": (
                        (u.streak.current_streak if u.streak else 0) if metric == "streak" else
                        u.help_points if metric == "helppoints" else
                        u.reputation if metric == "reputation" else
                        (u.streak.total_study_mins if u.streak else 0)
                    )
                }
                for u in users
            ],
            key=lambda x: -x["score"],
        )
        my_rank = next(
            (i + 1 for i, e in enumerate(all_entries_sorted) if e["user_id"] == current_user.id),
            None,
        )

    return {
        "entries": entries,
        "scope": scope,
        "period": period,
        "metric": metric,
        "my_rank": my_rank,
        "total_participants": len(users),
    }


# ══════════════════════════════════════════════════════════
# STREAKS
# ══════════════════════════════════════════════════════════

@router.get("/streaks/me")
def get_my_streak(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    streak = current_user.streak
    if not streak:
        streak = models.Streak(user_id=current_user.id)
        db.add(streak)
        db.commit()
        db.refresh(streak)

    now = datetime.now(timezone.utc)
    last = streak.last_active_date

    # Days since last activity
    days_inactive = (now.date() - last.date()).days if last else 999

    return {
        "current_streak": streak.current_streak,
        "longest_streak": streak.longest_streak,
        "total_study_mins": streak.total_study_mins,
        "last_active": last.isoformat() if last else None,
        "days_inactive": days_inactive,
        "streak_alive": days_inactive <= 1,
        "study_hours": round(streak.total_study_mins / 60, 1),
        "streak_history": _build_streak_calendar(streak),
    }


@router.post("/streaks/checkin")
def daily_checkin(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    """
    Manual daily check-in (in addition to login-based streak update).
    Useful for users who stay logged in for days.
    """
    streak = current_user.streak
    if not streak:
        streak = models.Streak(user_id=current_user.id)
        db.add(streak)
        db.flush()

    now  = datetime.now(timezone.utc)
    last = streak.last_active_date

    if last and (now.date() - last.date()).days == 0:
        return {
            "message": "Already checked in today! ✅",
            "current_streak": streak.current_streak,
            "already_done": True,
        }

    if last is None or (now.date() - last.date()).days == 1:
        streak.current_streak += 1
    elif (now.date() - last.date()).days > 1:
        streak.current_streak = 1   # broken

    streak.longest_streak  = max(streak.longest_streak, streak.current_streak)
    streak.last_active_date = now

    # Milestone bonuses
    bonus_points = 0
    milestones = {3: 5, 7: 15, 14: 30, 30: 75, 60: 150, 100: 300}
    if streak.current_streak in milestones:
        bonus_points = milestones[streak.current_streak]
        current_user.help_points += bonus_points
        current_user.reputation  += bonus_points // 2
        create_notification(
            db, current_user.id, "streak_milestone",
            f"🔥 {streak.current_streak}-day streak! +{bonus_points} help points bonus!",
        )

    db.commit()

    # Check for new badges after checkin
    new_badges = _check_and_award_badges(current_user, db)

    return {
        "message": f"Check-in successful! 🔥 {streak.current_streak}-day streak!",
        "current_streak": streak.current_streak,
        "longest_streak": streak.longest_streak,
        "already_done": False,
        "bonus_points": bonus_points,
        "new_badges": new_badges,
    }


# ══════════════════════════════════════════════════════════
# STREAK WARS
# ══════════════════════════════════════════════════════════

@router.post("/streak-wars", status_code=201)
def create_streak_war(
    req: StreakWarCreate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    now = datetime.now(timezone.utc)
    war = models.StreakWar(
        name=req.name.strip(),
        war_type=req.war_type,
        team_a=req.team_a.strip(),
        team_b=req.team_b.strip(),
        score_a=0,
        score_b=0,
        starts_at=now,
        ends_at=now + timedelta(days=req.duration_days),
    )
    db.add(war)
    db.commit()
    db.refresh(war)
    return _serialize_war(war, current_user, db)


@router.get("/streak-wars")
def list_streak_wars(
    active_only: bool = True,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    now = datetime.now(timezone.utc)
    query = db.query(models.StreakWar)

    if active_only:
        query = query.filter(
            models.StreakWar.ends_at > now,
            models.StreakWar.starts_at <= now,
        )

    wars = query.order_by(desc(models.StreakWar.starts_at)).all()
    return [_serialize_war(w, current_user, db) for w in wars]


@router.get("/streak-wars/{war_id}")
def get_streak_war(
    war_id: str,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    war = _get_war_or_404(war_id, db)
    data = _serialize_war(war, current_user, db)

    # Add detailed member lists
    data["team_a_members"] = _get_team_members(war, "a", db)
    data["team_b_members"] = _get_team_members(war, "b", db)
    return data


@router.post("/streak-wars/{war_id}/join/{team}")
def join_streak_war(
    war_id: str,
    team: str,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    if team not in ("a", "b"):
        raise HTTPException(status_code=400, detail="Team must be 'a' or 'b'.")

    war = _get_war_or_404(war_id, db)
    now = datetime.now(timezone.utc)

    if war.ends_at < now:
        raise HTTPException(status_code=400, detail="This war has ended.")

    team_name = war.team_a if team == "a" else war.team_b

    # Verify user belongs to the team
    if war.war_type == "school" and current_user.school:
        if team_name.lower() not in current_user.school.lower():
            raise HTTPException(
                status_code=403,
                detail=f"You can only join your own school's team ({current_user.school})."
            )
    elif war.war_type == "class" and current_user.grade:
        if team_name.lower() not in current_user.grade.lower():
            raise HTTPException(
                status_code=403,
                detail=f"You can only join your own class's team ({current_user.grade})."
            )

    # Add streak contribution
    streak = current_user.streak
    contribution = streak.current_streak if streak else 0

    if team == "a":
        war.score_a += contribution
    else:
        war.score_b += contribution

    db.commit()
    return {
        "message": f"Joined Team {team_name} with {contribution} streak points!",
        "contribution": contribution,
        "war": _serialize_war(war, current_user, db),
    }


# ══════════════════════════════════════════════════════════
# BADGES
# ══════════════════════════════════════════════════════════

@router.get("/badges")
def list_all_badges(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    """Returns all badge definitions."""
    badges = db.query(models.Badge).all()
    if not badges:
        # Seed badges if empty
        _seed_badges(db)
        badges = db.query(models.Badge).all()

    earned_ids = {
        ub.badge_id for ub in
        db.query(models.UserBadge).filter(
            models.UserBadge.user_id == current_user.id
        ).all()
    }

    return [
        {
            "id": b.id,
            "name": b.name,
            "description": b.description,
            "icon": b.icon,
            "condition": b.condition,
            "earned": b.id in earned_ids,
        }
        for b in badges
    ]


@router.get("/badges/me")
def my_badges(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    user_badges = (
        db.query(models.UserBadge)
        .filter(models.UserBadge.user_id == current_user.id)
        .order_by(desc(models.UserBadge.awarded_at))
        .all()
    )

    result = []
    for ub in user_badges:
        badge = db.query(models.Badge).filter(
            models.Badge.id == ub.badge_id
        ).first()
        if badge:
            result.append({
                "id": badge.id,
                "name": badge.name,
                "description": badge.description,
                "icon": badge.icon,
                "awarded_at": ub.awarded_at.isoformat(),
            })
    return result


@router.post("/badges/check")
def check_badges(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    """
    Manually trigger badge check for current user.
    Called after major actions (answer accepted, streak milestone, etc.)
    """
    new_badges = _check_and_award_badges(current_user, db)
    return {
        "new_badges": new_badges,
        "message": (
            f"🏆 {len(new_badges)} new badge(s) earned!" if new_badges
            else "No new badges yet. Keep going!"
        ),
    }


# ══════════════════════════════════════════════════════════
# SCHOOL STATS
# ══════════════════════════════════════════════════════════

@router.get("/stats/school")
def school_stats(
    school: Optional[str] = None,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    """
    Aggregate stats for a school — used on the Streak Wars page.
    """
    target = school or current_user.school
    if not target:
        raise HTTPException(status_code=400, detail="No school specified.")

    users = (
        db.query(models.User)
        .filter(
            models.User.school.ilike(f"%{target}%"),
            models.User.is_active == True,
        )
        .all()
    )

    if not users:
        return {"school": target, "members": 0}

    total_streak   = sum(u.streak.current_streak if u.streak else 0 for u in users)
    total_points   = sum(u.help_points for u in users)
    total_rep      = sum(u.reputation for u in users)
    avg_streak     = round(total_streak / len(users), 1)
    top_streaker   = max(users, key=lambda u: u.streak.current_streak if u.streak else 0)
    total_mins     = sum(u.streak.total_study_mins if u.streak else 0 for u in users)

    return {
        "school": target,
        "members": len(users),
        "total_streak_points": total_streak,
        "avg_streak": avg_streak,
        "total_help_points": total_points,
        "total_reputation": total_rep,
        "total_study_hours": round(total_mins / 60, 1),
        "top_streaker": {
            "id": top_streaker.id,
            "name": top_streaker.name,
            "username": top_streaker.username,
            "avatar_url": top_streaker.avatar_url,
            "streak": top_streaker.streak.current_streak if top_streaker.streak else 0,
        },
    }


# ══════════════════════════════════════════════════════════
# INTERNAL HELPERS
# ══════════════════════════════════════════════════════════

def _serialize_war(
    war: models.StreakWar,
    current_user: models.User,
    db: Session,
) -> dict:
    now = datetime.now(timezone.utc)
    is_active = war.starts_at <= now <= war.ends_at
    is_ended  = now > war.ends_at

    winner = None
    if is_ended:
        if war.score_a > war.score_b:
            winner = war.team_a
        elif war.score_b > war.score_a:
            winner = war.team_b
        else:
            winner = "draw"

    return {
        "id": war.id,
        "name": war.name,
        "war_type": war.war_type,
        "team_a": war.team_a,
        "team_b": war.team_b,
        "score_a": war.score_a,
        "score_b": war.score_b,
        "starts_at": war.starts_at.isoformat(),
        "ends_at": war.ends_at.isoformat(),
        "is_active": is_active,
        "is_ended": is_ended,
        "winner": winner,
        "days_remaining": max(0, (war.ends_at - now).days) if is_active else 0,
        "leading_team": (
            war.team_a if war.score_a > war.score_b else
            war.team_b if war.score_b > war.score_a else
            "tied"
        ),
    }


def _get_war_or_404(war_id: str, db: Session) -> models.StreakWar:
    war = db.query(models.StreakWar).filter(
        models.StreakWar.id == war_id
    ).first()
    if not war:
        raise HTTPException(status_code=404, detail="Streak war not found.")
    return war


def _get_team_members(
    war: models.StreakWar,
    team: str,
    db: Session,
) -> list:
    team_name = war.team_a if team == "a" else war.team_b

    if war.war_type == "school":
        users = db.query(models.User).filter(
            models.User.school.ilike(f"%{team_name}%"),
            models.User.is_active == True,
        ).limit(20).all()
    else:
        users = db.query(models.User).filter(
            models.User.grade.ilike(f"%{team_name}%"),
            models.User.is_active == True,
        ).limit(20).all()

    return [
        {
            "id": u.id,
            "name": u.name,
            "username": u.username,
            "avatar_url": u.avatar_url,
            "streak": u.streak.current_streak if u.streak else 0,
            "study_status": u.study_status,
        }
        for u in sorted(users, key=lambda u: -(u.streak.current_streak if u.streak else 0))
    ]


def _build_streak_calendar(streak: models.Streak) -> list:
    """
    Builds last 30 days of activity for the heatmap calendar.
    (Simplified: marks today and last_active as active.)
    """
    today = datetime.now(timezone.utc).date()
    last  = streak.last_active_date.date() if streak.last_active_date else None
    current = streak.current_streak

    calendar = []
    for i in range(29, -1, -1):
        day = today - timedelta(days=i)
        active = False
        if last and current > 0:
            # Mark days in current streak window
            days_from_last = (last - day).days
            if 0 <= days_from_last < current:
                active = True
        calendar.append({
            "date": day.isoformat(),
            "active": active,
            "is_today": day == today,
        })
    return calendar


def _check_and_award_badges(
    user: models.User,
    db: Session,
) -> list:
    """
    Checks all badge conditions and awards any newly-earned badges.
    Returns list of newly awarded badge dicts.
    """
    badges = db.query(models.Badge).all()
    if not badges:
        _seed_badges(db)
        badges = db.query(models.Badge).all()

    already_earned = {
        ub.badge_id for ub in
        db.query(models.UserBadge).filter(
            models.UserBadge.user_id == user.id
        ).all()
    }

    streak    = user.streak.current_streak if user.streak else 0
    longest   = user.streak.longest_streak if user.streak else 0
    help_pts  = user.help_points
    rep       = user.reputation
    followers = len(user.followers_list)
    role      = user.role

    uploads  = db.query(models.Resource).filter(
        models.Resource.uploader_id == user.id
    ).count()
    accepted = db.query(models.Answer).filter(
        models.Answer.author_id == user.id,
        models.Answer.is_accepted == True,
    ).count()
    answers  = db.query(models.Answer).filter(
        models.Answer.author_id == user.id
    ).count()

    newly_awarded = []
    for badge in badges:
        if badge.id in already_earned:
            continue

        cond = badge.condition
        earned = False

        if cond == "answered_first_question":
            earned = answers >= 1
        elif cond.startswith("help_points>="):
            earned = help_pts >= int(cond.split(">=")[1])
        elif cond.startswith("accepted_answers>="):
            earned = accepted >= int(cond.split(">=")[1])
        elif cond.startswith("streak>="):
            earned = longest >= int(cond.split(">=")[1])
        elif cond.startswith("uploads>="):
            earned = uploads >= int(cond.split(">=")[1])
        elif cond.startswith("followers>="):
            earned = followers >= int(cond.split(">=")[1])
        elif cond == "role==mentor":
            earned = role == "mentor"
        elif cond.startswith("reputation>="):
            earned = rep >= int(cond.split(">=")[1])

        if earned:
            ub = models.UserBadge(user_id=user.id, badge_id=badge.id)
            db.add(ub)
            newly_awarded.append({
                "id": badge.id,
                "name": badge.name,
                "icon": badge.icon,
                "description": badge.description,
            })
            create_notification(
                db, user.id, "badge",
                f"{badge.icon} You earned the \"{badge.name}\" badge!",
            )

    if newly_awarded:
        db.commit()

    return newly_awarded


def _seed_badges(db: Session) -> None:
    """Seeds the badges table with default badge definitions."""
    definitions = [
        models.Badge(name="First Step",       icon="🎯", condition="answered_first_question",  description="Answered your first question"),
        models.Badge(name="Helping Hand",     icon="🤝", condition="help_points>=10",           description="Earned 10 help points"),
        models.Badge(name="Problem Solver",   icon="🧠", condition="accepted_answers>=5",       description="Got 5 answers accepted"),
        models.Badge(name="Streak Starter",   icon="🔥", condition="streak>=3",                 description="3-day study streak"),
        models.Badge(name="Week Warrior",     icon="⚡", condition="streak>=7",                 description="7-day study streak"),
        models.Badge(name="Month Master",     icon="👑", condition="streak>=30",                description="30-day study streak"),
        models.Badge(name="Resource Hero",    icon="📚", condition="uploads>=5",                description="Uploaded 5 resources"),
        models.Badge(name="Social Butterfly", icon="🦋", condition="followers>=10",             description="10 followers"),
        models.Badge(name="Mentor Badge",     icon="🎓", condition="role==mentor",              description="Became a mentor"),
        models.Badge(name="Top Contributor",  icon="🏆", condition="reputation>=100",           description="Reached 100 reputation"),
        models.Badge(name="Scholar",          icon="📖", condition="reputation>=500",           description="Reached 500 reputation"),
        models.Badge(name="Guru",             icon="✨", condition="reputation>=1000",          description="Reached 1000 reputation"),
    ]
    for b in definitions:
        existing = db.query(models.Badge).filter(
            models.Badge.name == b.name
        ).first()
        if not existing:
            db.add(b)
    db.commit()
