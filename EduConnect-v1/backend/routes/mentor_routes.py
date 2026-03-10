"""
mentor_routes.py — LinkedIn-style Mentor Discovery & Matching
POST   /api/mentor/profiles
GET    /api/mentor/profiles
GET    /api/mentor/profiles/{mentor_id}
PUT    /api/mentor/profiles/{mentor_id}
POST   /api/mentor/request
GET    /api/mentor/requests/sent
GET    /api/mentor/requests/received
PUT    /api/mentor/requests/{req_id}/respond
POST   /api/mentor/profiles/{mentor_id}/review
GET    /api/mentor/profiles/{mentor_id}/reviews
GET    /api/mentor/recommend          ← smart recommendations
"""

import json
from typing import Optional, List

from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel, field_validator
from sqlalchemy.orm import Session
from sqlalchemy import desc, or_

from database import get_db
from auth import get_current_user, create_notification
import models

router = APIRouter()


# ══════════════════════════════════════════════════════════
# SCHEMAS
# ══════════════════════════════════════════════════════════

class MentorProfileCreate(BaseModel):
    headline: Optional[str] = None
    subjects: Optional[List[str]] = []
    exam_target: Optional[str] = None
    language: Optional[str] = None
    region: Optional[str] = None
    availability: Optional[dict] = None
    is_available: bool = True


class MentorProfileUpdate(BaseModel):
    headline: Optional[str] = None
    subjects: Optional[List[str]] = None
    exam_target: Optional[str] = None
    language: Optional[str] = None
    region: Optional[str] = None
    availability: Optional[dict] = None
    is_available: Optional[bool] = None


class MentorRequestCreate(BaseModel):
    mentor_id: str
    message: Optional[str] = None
    subject: Optional[str] = None


class MentorRequestRespond(BaseModel):
    action: str   # "accept" | "reject"

    @field_validator("action")
    @classmethod
    def valid_action(cls, v):
        if v not in ("accept", "reject"):
            raise ValueError("Action must be 'accept' or 'reject'.")
        return v


class MentorReviewCreate(BaseModel):
    rating: float
    content: Optional[str] = None

    @field_validator("rating")
    @classmethod
    def valid_rating(cls, v):
        if not (1.0 <= v <= 5.0):
            raise ValueError("Rating must be between 1 and 5.")
        return round(v, 1)


# ══════════════════════════════════════════════════════════
# SERIALIZERS
# ══════════════════════════════════════════════════════════

def serialize_mentor(
    mp: models.MentorProfile,
    current_user: models.User,
    db: Session,
) -> dict:
    u = mp.user
    reviews = mp.reviews

    # Check if current user has sent a request
    pending_request = db.query(models.MentorRequest).filter(
        models.MentorRequest.from_user == current_user.id,
        models.MentorRequest.mentor_id == mp.id,
        models.MentorRequest.status == "pending",
    ).first()

    accepted_request = db.query(models.MentorRequest).filter(
        models.MentorRequest.from_user == current_user.id,
        models.MentorRequest.mentor_id == mp.id,
        models.MentorRequest.status == "accepted",
    ).first()

    return {
        "id": mp.id,
        "user_id": u.id,
        "name": u.name,
        "username": u.username,
        "avatar_url": u.avatar_url,
        "headline": mp.headline,
        "subjects": json.loads(mp.subjects) if mp.subjects else [],
        "exam_target": mp.exam_target,
        "language": mp.language,
        "region": mp.region,
        "rating": round(mp.rating, 1),
        "total_sessions": mp.total_sessions,
        "is_available": mp.is_available,
        "availability": json.loads(mp.availability) if mp.availability else {},
        "reputation": u.reputation,
        "help_points": u.help_points,
        "school": u.school,
        "grade": u.grade,
        "study_status": u.study_status,
        "reviews_count": len(reviews),
        "is_me": u.id == current_user.id,
        "connection_status": (
            "connected" if accepted_request else
            "pending" if pending_request else
            "none"
        ),
    }


def serialize_request(
    req: models.MentorRequest,
    current_user: models.User,
    db: Session,
) -> dict:
    from_user = db.query(models.User).filter(
        models.User.id == req.from_user
    ).first()
    mentor_user = req.mentor.user if req.mentor else None

    return {
        "id": req.id,
        "status": req.status,
        "message": req.message,
        "subject": req.subject,
        "created_at": req.created_at.isoformat(),
        "from_user": {
            "id": from_user.id,
            "name": from_user.name,
            "username": from_user.username,
            "avatar_url": from_user.avatar_url,
            "exam_target": from_user.exam_target,
            "school": from_user.school,
        } if from_user else None,
        "mentor": {
            "id": req.mentor.id,
            "user_id": mentor_user.id if mentor_user else None,
            "name": mentor_user.name if mentor_user else None,
            "username": mentor_user.username if mentor_user else None,
            "avatar_url": mentor_user.avatar_url if mentor_user else None,
            "headline": req.mentor.headline,
        } if req.mentor else None,
    }


def serialize_review(r: models.MentorReview) -> dict:
    return {
        "id": r.id,
        "rating": r.rating,
        "content": r.content,
        "created_at": r.created_at.isoformat(),
        "reviewer": {
            "id": r.reviewer_id,
            "name": r.mentor.user.name if r.mentor else "Unknown",
        },
    }


def recalculate_rating(mentor: models.MentorProfile) -> None:
    reviews = mentor.reviews
    if not reviews:
        mentor.rating = 0.0
        return
    mentor.rating = sum(r.rating for r in reviews) / len(reviews)


# ══════════════════════════════════════════════════════════
# MENTOR PROFILE
# ══════════════════════════════════════════════════════════

@router.post("/profiles", status_code=201)
def create_mentor_profile(
    req: MentorProfileCreate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    if current_user.mentor_profile:
        raise HTTPException(
            status_code=400,
            detail="You already have a mentor profile. Use PUT to update it."
        )

    profile = models.MentorProfile(
        user_id=current_user.id,
        headline=req.headline,
        subjects=json.dumps(req.subjects or []),
        exam_target=req.exam_target or current_user.exam_target,
        language=req.language or current_user.language,
        region=req.region or current_user.region,
        availability=json.dumps(req.availability or {}),
        is_available=req.is_available,
    )
    db.add(profile)

    # Upgrade role
    current_user.role = "mentor"
    db.commit()
    db.refresh(profile)
    return serialize_mentor(profile, current_user, db)


@router.get("/profiles")
def list_mentors(
    exam_target: Optional[str] = None,
    subject: Optional[str] = None,
    language: Optional[str] = None,
    region: Optional[str] = None,
    available_only: bool = False,
    q: Optional[str] = None,
    sort: str = "rating",           # rating | sessions | newest
    page: int = 1,
    limit: int = 12,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    query = db.query(models.MentorProfile)

    if available_only:
        query = query.filter(models.MentorProfile.is_available == True)
    if exam_target:
        query = query.filter(models.MentorProfile.exam_target == exam_target)
    if language:
        query = query.filter(models.MentorProfile.language == language)
    if region:
        query = query.filter(models.MentorProfile.region.ilike(f"%{region}%"))
    if subject:
        query = query.filter(
            models.MentorProfile.subjects.ilike(f"%{subject}%")
        )
    if q:
        like = f"%{q}%"
        query = (
            query
            .join(models.User, models.MentorProfile.user_id == models.User.id)
            .filter(
                or_(
                    models.User.name.ilike(like),
                    models.MentorProfile.headline.ilike(like),
                    models.MentorProfile.subjects.ilike(like),
                )
            )
        )

    if sort == "rating":
        query = query.order_by(desc(models.MentorProfile.rating))
    elif sort == "sessions":
        query = query.order_by(desc(models.MentorProfile.total_sessions))
    else:
        query = query.order_by(desc(models.MentorProfile.created_at))

    total = query.count()
    mentors = query.offset((page - 1) * limit).limit(limit).all()

    return {
        "mentors": [serialize_mentor(m, current_user, db) for m in mentors],
        "total": total,
        "page": page,
        "pages": (total + limit - 1) // limit,
    }


@router.get("/profiles/{mentor_id}")
def get_mentor(
    mentor_id: str,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    mp = db.query(models.MentorProfile).filter(
        models.MentorProfile.id == mentor_id
    ).first()
    if not mp:
        raise HTTPException(status_code=404, detail="Mentor profile not found.")
    return serialize_mentor(mp, current_user, db)


@router.get("/by-user/{user_id}")
def get_mentor_by_user(
    user_id: str,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    mp = db.query(models.MentorProfile).filter(
        models.MentorProfile.user_id == user_id
    ).first()
    if not mp:
        raise HTTPException(status_code=404, detail="This user has no mentor profile.")
    return serialize_mentor(mp, current_user, db)


@router.put("/profiles/{mentor_id}")
def update_mentor_profile(
    mentor_id: str,
    req: MentorProfileUpdate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    mp = db.query(models.MentorProfile).filter(
        models.MentorProfile.id == mentor_id
    ).first()
    if not mp:
        raise HTTPException(status_code=404, detail="Mentor profile not found.")
    if mp.user_id != current_user.id:
        raise HTTPException(status_code=403, detail="Not your mentor profile.")

    if req.headline is not None:
        mp.headline = req.headline
    if req.subjects is not None:
        mp.subjects = json.dumps(req.subjects)
    if req.exam_target is not None:
        mp.exam_target = req.exam_target
    if req.language is not None:
        mp.language = req.language
    if req.region is not None:
        mp.region = req.region
    if req.availability is not None:
        mp.availability = json.dumps(req.availability)
    if req.is_available is not None:
        mp.is_available = req.is_available

    db.commit()
    db.refresh(mp)
    return serialize_mentor(mp, current_user, db)


# ══════════════════════════════════════════════════════════
# MENTOR REQUESTS
# ══════════════════════════════════════════════════════════

@router.post("/request", status_code=201)
def send_mentor_request(
    req: MentorRequestCreate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    mentor = db.query(models.MentorProfile).filter(
        models.MentorProfile.id == req.mentor_id
    ).first()
    if not mentor:
        raise HTTPException(status_code=404, detail="Mentor not found.")
    if mentor.user_id == current_user.id:
        raise HTTPException(status_code=400, detail="Cannot request yourself as mentor.")
    if not mentor.is_available:
        raise HTTPException(status_code=400, detail="This mentor is currently unavailable.")

    # Check for existing pending request
    existing = db.query(models.MentorRequest).filter(
        models.MentorRequest.from_user == current_user.id,
        models.MentorRequest.mentor_id == req.mentor_id,
        models.MentorRequest.status == "pending",
    ).first()
    if existing:
        raise HTTPException(
            status_code=400,
            detail="You already have a pending request with this mentor."
        )

    mr = models.MentorRequest(
        from_user=current_user.id,
        mentor_id=req.mentor_id,
        message=req.message,
        subject=req.subject,
    )
    db.add(mr)

    create_notification(
        db, mentor.user_id, "mentor_request",
        f"{current_user.name} wants you as their mentor"
        + (f" for {req.subject}." if req.subject else "."),
        link=f"/mentor/requests",
    )

    db.commit()
    db.refresh(mr)
    return serialize_request(mr, current_user, db)


@router.get("/requests/sent")
def get_sent_requests(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    requests = (
        db.query(models.MentorRequest)
        .filter(models.MentorRequest.from_user == current_user.id)
        .order_by(desc(models.MentorRequest.created_at))
        .all()
    )
    return [serialize_request(r, current_user, db) for r in requests]


@router.get("/requests/received")
def get_received_requests(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    if not current_user.mentor_profile:
        return []

    requests = (
        db.query(models.MentorRequest)
        .filter(
            models.MentorRequest.mentor_id == current_user.mentor_profile.id,
            models.MentorRequest.status == "pending",
        )
        .order_by(desc(models.MentorRequest.created_at))
        .all()
    )
    return [serialize_request(r, current_user, db) for r in requests]


@router.put("/requests/{req_id}/respond")
def respond_to_request(
    req_id: str,
    body: MentorRequestRespond,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    mr = db.query(models.MentorRequest).filter(
        models.MentorRequest.id == req_id
    ).first()
    if not mr:
        raise HTTPException(status_code=404, detail="Request not found.")

    # Verify current user is the mentor
    if not current_user.mentor_profile or mr.mentor_id != current_user.mentor_profile.id:
        raise HTTPException(status_code=403, detail="Not your mentor request.")
    if mr.status != "pending":
        raise HTTPException(status_code=400, detail="Request already responded to.")

    mr.status = "accepted" if body.action == "accept" else "rejected"

    if body.action == "accept":
        current_user.mentor_profile.total_sessions += 1
        create_notification(
            db, mr.from_user, "mentor_accepted",
            f"{current_user.name} accepted your mentor request! 🎉",
            link=f"/chat",
        )
        # Auto-create a DM between mentor and mentee
        existing_chat = (
            db.query(models.Chat)
            .filter(models.Chat.is_group == False)
            .filter(models.Chat.participants.any(models.User.id == current_user.id))
            .filter(models.Chat.participants.any(models.User.id == mr.from_user))
            .first()
        )
        if not existing_chat:
            chat = models.Chat(
                is_group=False,
                created_by=current_user.id,
            )
            db.add(chat)
            db.flush()
            chat.participants.append(current_user)
            mentee = db.query(models.User).filter(
                models.User.id == mr.from_user
            ).first()
            if mentee:
                chat.participants.append(mentee)
            # Welcome message
            welcome = models.Message(
                chat_id=chat.id,
                sender_id=current_user.id,
                content=f"Hi! I've accepted your mentor request. Let's get started! 🚀",
            )
            db.add(welcome)
    else:
        create_notification(
            db, mr.from_user, "mentor_rejected",
            f"{current_user.name} is not available for mentoring right now.",
            link=f"/mentor",
        )

    db.commit()
    return serialize_request(mr, current_user, db)


# ══════════════════════════════════════════════════════════
# REVIEWS
# ══════════════════════════════════════════════════════════

@router.post("/profiles/{mentor_id}/review", status_code=201)
def add_review(
    mentor_id: str,
    req: MentorReviewCreate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    mentor = db.query(models.MentorProfile).filter(
        models.MentorProfile.id == mentor_id
    ).first()
    if not mentor:
        raise HTTPException(status_code=404, detail="Mentor not found.")
    if mentor.user_id == current_user.id:
        raise HTTPException(status_code=400, detail="Cannot review yourself.")

    # Verify they had an accepted session
    had_session = db.query(models.MentorRequest).filter(
        models.MentorRequest.from_user == current_user.id,
        models.MentorRequest.mentor_id == mentor_id,
        models.MentorRequest.status == "accepted",
    ).first()
    if not had_session:
        raise HTTPException(
            status_code=403,
            detail="You can only review mentors you've had a session with."
        )

    # Check for existing review
    existing = db.query(models.MentorReview).filter(
        models.MentorReview.mentor_id == mentor_id,
        models.MentorReview.reviewer_id == current_user.id,
    ).first()
    if existing:
        existing.rating = req.rating
        existing.content = req.content
    else:
        review = models.MentorReview(
            mentor_id=mentor_id,
            reviewer_id=current_user.id,
            rating=req.rating,
            content=req.content,
        )
        db.add(review)

    recalculate_rating(mentor)
    db.commit()
    return {"message": "Review submitted.", "new_rating": round(mentor.rating, 1)}


@router.get("/profiles/{mentor_id}/reviews")
def get_reviews(
    mentor_id: str,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    mentor = db.query(models.MentorProfile).filter(
        models.MentorProfile.id == mentor_id
    ).first()
    if not mentor:
        raise HTTPException(status_code=404, detail="Mentor not found.")

    reviews = (
        db.query(models.MentorReview)
        .filter(models.MentorReview.mentor_id == mentor_id)
        .order_by(desc(models.MentorReview.created_at))
        .all()
    )

    return {
        "reviews": [
            {
                "id": r.id,
                "rating": r.rating,
                "content": r.content,
                "created_at": r.created_at.isoformat(),
                "reviewer": {
                    "id": r.reviewer_id,
                    "name": db.query(models.User).filter(
                        models.User.id == r.reviewer_id
                    ).first().name,
                    "avatar_url": db.query(models.User).filter(
                        models.User.id == r.reviewer_id
                    ).first().avatar_url,
                },
            }
            for r in reviews
        ],
        "avg_rating": round(mentor.rating, 1),
        "total_reviews": len(reviews),
    }


# ══════════════════════════════════════════════════════════
# SMART RECOMMENDATIONS
# ══════════════════════════════════════════════════════════

@router.get("/recommend")
def recommend_mentors(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    """
    Returns personalised mentor recommendations based on:
    - Same exam target
    - Same region / language
    - Highest rating
    - Not already connected
    """
    # Get IDs of mentors already connected or pending
    connected_ids = [
        r.mentor_id for r in db.query(models.MentorRequest).filter(
            models.MentorRequest.from_user == current_user.id,
            models.MentorRequest.status.in_(["pending", "accepted"]),
        ).all()
    ]

    query = (
        db.query(models.MentorProfile)
        .filter(models.MentorProfile.is_available == True)
        .filter(models.MentorProfile.user_id != current_user.id)
        .filter(~models.MentorProfile.id.in_(connected_ids))
    )

    # Score mentors
    mentors = query.all()
    scored = []
    for mp in mentors:
        score = mp.rating * 10
        if mp.exam_target == current_user.exam_target:
            score += 30
        if mp.language == current_user.language:
            score += 15
        if mp.region == current_user.region:
            score += 10
        scored.append((score, mp))

    scored.sort(key=lambda x: -x[0])
    top = [mp for _, mp in scored[:6]]

    return [serialize_mentor(mp, current_user, db) for mp in top]
