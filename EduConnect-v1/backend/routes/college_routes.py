"""
college_routes.py — College Reviews Backend
POST   /api/colleges
GET    /api/colleges
GET    /api/colleges/{college_id}
PUT    /api/colleges/{college_id}
POST   /api/colleges/{college_id}/reviews
PUT    /api/colleges/{college_id}/reviews/{review_id}
DELETE /api/colleges/{college_id}/reviews/{review_id}
GET    /api/colleges/{college_id}/reviews
GET    /api/colleges/top/rated
"""

import json
from typing import Optional, List
from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel, field_validator
from sqlalchemy.orm import Session
from sqlalchemy import desc, or_, func

from database import get_db
from auth import get_current_user, create_notification
import models

router = APIRouter()


# ══════════════════════════════════════════════════════════
# SCHEMAS
# ══════════════════════════════════════════════════════════

class CollegeCreate(BaseModel):
    name: str
    location: Optional[str] = None
    courses: Optional[List[str]] = []
    website: Optional[str] = None


class CollegeUpdate(BaseModel):
    name: Optional[str] = None
    location: Optional[str] = None
    courses: Optional[List[str]] = None
    website: Optional[str] = None


class ReviewCreate(BaseModel):
    rating: float
    content: str
    year_of_admission: Optional[int] = None
    course: Optional[str] = None
    pros: Optional[str] = None
    cons: Optional[str] = None

    @field_validator("rating")
    @classmethod
    def valid_rating(cls, v):
        if not (1.0 <= v <= 5.0):
            raise ValueError("Rating must be between 1.0 and 5.0.")
        return round(v, 1)

    @field_validator("content")
    @classmethod
    def valid_content(cls, v):
        if len(v.strip()) < 20:
            raise ValueError("Review must be at least 20 characters.")
        return v.strip()

    @field_validator("year_of_admission")
    @classmethod
    def valid_year(cls, v):
        if v is not None:
            current_year = datetime.now().year
            if not (1990 <= v <= current_year + 1):
                raise ValueError(f"Year must be between 1990 and {current_year + 1}.")
        return v


class ReviewUpdate(BaseModel):
    rating: Optional[float] = None
    content: Optional[str] = None
    year_of_admission: Optional[int] = None
    course: Optional[str] = None
    pros: Optional[str] = None
    cons: Optional[str] = None

    @field_validator("rating")
    @classmethod
    def valid_rating(cls, v):
        if v is not None and not (1.0 <= v <= 5.0):
            raise ValueError("Rating must be between 1.0 and 5.0.")
        return round(v, 1) if v else v


# ══════════════════════════════════════════════════════════
# SERIALIZERS
# ══════════════════════════════════════════════════════════

def serialize_college(
    college: models.College,
    current_user: models.User,
    db: Session,
    include_reviews: bool = False,
) -> dict:
    reviews = college.reviews
    total   = len(reviews)

    # Rating breakdown
    rating_dist = {1: 0, 2: 0, 3: 0, 4: 0, 5: 0}
    for r in reviews:
        bucket = min(5, max(1, round(r.rating)))
        rating_dist[bucket] += 1

    # Has current user reviewed?
    my_review = next(
        (r for r in reviews if r.author_id == current_user.id), None
    )

    data = {
        "id": college.id,
        "name": college.name,
        "location": college.location,
        "courses": json.loads(college.courses) if college.courses else [],
        "website": college.website,
        "avg_rating": round(college.avg_rating, 1),
        "reviews_count": total,
        "rating_distribution": rating_dist,
        "created_at": college.created_at.isoformat(),
        "has_reviewed": my_review is not None,
        "my_review_id": my_review.id if my_review else None,
    }

    if include_reviews:
        data["reviews"] = [
            serialize_review(r, current_user, db) for r in
            sorted(reviews, key=lambda r: r.created_at, reverse=True)
        ]

    return data


def serialize_review(
    r: models.CollegeReview,
    current_user: models.User,
    db: Session,
) -> dict:
    author = db.query(models.User).filter(
        models.User.id == r.author_id
    ).first()

    return {
        "id": r.id,
        "college_id": r.college_id,
        "rating": r.rating,
        "content": r.content,
        "year_of_admission": r.year_of_admission,
        "course": r.course,
        "pros": r.pros,
        "cons": r.cons,
        "created_at": r.created_at.isoformat(),
        "is_mine": r.author_id == current_user.id,
        "author": {
            "id": author.id if author else r.author_id,
            "name": author.name if author else "Unknown",
            "username": author.username if author else "",
            "avatar_url": author.avatar_url if author else None,
            "exam_target": author.exam_target if author else None,
            "school": author.school if author else None,
        } if author else None,
    }


def _recalculate_avg(college: models.College) -> None:
    reviews = college.reviews
    if not reviews:
        college.avg_rating = 0.0
    else:
        college.avg_rating = sum(r.rating for r in reviews) / len(reviews)


# ══════════════════════════════════════════════════════════
# COLLEGES — CRUD
# ══════════════════════════════════════════════════════════

@router.post("", status_code=201)
def create_college(
    req: CollegeCreate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    if not req.name.strip():
        raise HTTPException(status_code=400, detail="College name is required.")

    # Prevent duplicates (case-insensitive)
    existing = db.query(models.College).filter(
        models.College.name.ilike(req.name.strip())
    ).first()
    if existing:
        raise HTTPException(
            status_code=400,
            detail=f"College '{req.name}' already exists. You can add a review to it."
        )

    college = models.College(
        name=req.name.strip(),
        location=req.location,
        courses=json.dumps(req.courses or []),
        website=req.website,
    )
    db.add(college)
    db.commit()
    db.refresh(college)
    return serialize_college(college, current_user, db)


@router.get("")
def list_colleges(
    q: Optional[str] = None,
    location: Optional[str] = None,
    course: Optional[str] = None,
    min_rating: Optional[float] = None,
    sort: str = "rating",             # rating | reviews | name | newest
    page: int = 1,
    limit: int = 12,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    query = db.query(models.College)

    if q:
        like = f"%{q}%"
        query = query.filter(
            or_(
                models.College.name.ilike(like),
                models.College.location.ilike(like),
                models.College.courses.ilike(like),
            )
        )
    if location:
        query = query.filter(models.College.location.ilike(f"%{location}%"))
    if course:
        query = query.filter(models.College.courses.ilike(f"%{course}%"))
    if min_rating is not None:
        query = query.filter(models.College.avg_rating >= min_rating)

    if sort == "rating":
        query = query.order_by(desc(models.College.avg_rating))
    elif sort == "reviews":
        # Sort by review count via subquery
        review_count = (
            db.query(
                models.CollegeReview.college_id,
                func.count(models.CollegeReview.id).label("cnt")
            )
            .group_by(models.CollegeReview.college_id)
            .subquery()
        )
        query = (
            query
            .outerjoin(review_count, models.College.id == review_count.c.college_id)
            .order_by(desc(review_count.c.cnt))
        )
    elif sort == "name":
        query = query.order_by(models.College.name)
    else:
        query = query.order_by(desc(models.College.created_at))

    total = query.count()
    colleges = query.offset((page - 1) * limit).limit(limit).all()

    return {
        "colleges": [serialize_college(c, current_user, db) for c in colleges],
        "total": total,
        "page": page,
        "pages": (total + limit - 1) // limit,
    }


@router.get("/top/rated")
def top_colleges(
    limit: int = 5,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    """Quick widget: top 5 highest-rated colleges."""
    colleges = (
        db.query(models.College)
        .filter(models.College.avg_rating > 0)
        .order_by(desc(models.College.avg_rating))
        .limit(limit)
        .all()
    )
    return [serialize_college(c, current_user, db) for c in colleges]


@router.get("/{college_id}")
def get_college(
    college_id: str,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    college = _get_or_404(college_id, db)
    return serialize_college(college, current_user, db, include_reviews=True)


@router.put("/{college_id}")
def update_college(
    college_id: str,
    req: CollegeUpdate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    if current_user.role != "admin":
        raise HTTPException(status_code=403, detail="Only admins can edit college details.")

    college = _get_or_404(college_id, db)

    if req.name is not None:
        college.name = req.name.strip()
    if req.location is not None:
        college.location = req.location
    if req.courses is not None:
        college.courses = json.dumps(req.courses)
    if req.website is not None:
        college.website = req.website

    db.commit()
    db.refresh(college)
    return serialize_college(college, current_user, db)


# ══════════════════════════════════════════════════════════
# REVIEWS
# ══════════════════════════════════════════════════════════

@router.post("/{college_id}/reviews", status_code=201)
def add_review(
    college_id: str,
    req: ReviewCreate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    college = _get_or_404(college_id, db)

    # One review per user per college
    existing = db.query(models.CollegeReview).filter(
        models.CollegeReview.college_id == college_id,
        models.CollegeReview.author_id == current_user.id,
    ).first()
    if existing:
        raise HTTPException(
            status_code=400,
            detail="You have already reviewed this college. Edit your existing review."
        )

    review = models.CollegeReview(
        college_id=college_id,
        author_id=current_user.id,
        rating=req.rating,
        content=req.content,
        year_of_admission=req.year_of_admission,
        course=req.course,
        pros=req.pros,
        cons=req.cons,
    )
    db.add(review)
    db.flush()

    _recalculate_avg(college)

    # Reward reviewer with help points
    current_user.help_points += 2
    current_user.reputation  += 3

    db.commit()
    db.refresh(review)
    return serialize_review(review, current_user, db)


@router.put("/{college_id}/reviews/{review_id}")
def update_review(
    college_id: str,
    review_id: str,
    req: ReviewUpdate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    review = db.query(models.CollegeReview).filter(
        models.CollegeReview.id == review_id,
        models.CollegeReview.college_id == college_id,
    ).first()
    if not review:
        raise HTTPException(status_code=404, detail="Review not found.")
    if review.author_id != current_user.id:
        raise HTTPException(status_code=403, detail="Not your review.")

    if req.rating is not None:
        review.rating = req.rating
    if req.content is not None:
        if len(req.content.strip()) < 20:
            raise HTTPException(
                status_code=400, detail="Review must be at least 20 characters."
            )
        review.content = req.content.strip()
    if req.year_of_admission is not None:
        review.year_of_admission = req.year_of_admission
    if req.course is not None:
        review.course = req.course
    if req.pros is not None:
        review.pros = req.pros
    if req.cons is not None:
        review.cons = req.cons

    college = _get_or_404(college_id, db)
    _recalculate_avg(college)
    db.commit()
    db.refresh(review)
    return serialize_review(review, current_user, db)


@router.delete("/{college_id}/reviews/{review_id}")
def delete_review(
    college_id: str,
    review_id: str,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    review = db.query(models.CollegeReview).filter(
        models.CollegeReview.id == review_id,
        models.CollegeReview.college_id == college_id,
    ).first()
    if not review:
        raise HTTPException(status_code=404, detail="Review not found.")
    if review.author_id != current_user.id and current_user.role != "admin":
        raise HTTPException(status_code=403, detail="Not your review.")

    college = _get_or_404(college_id, db)
    db.delete(review)
    db.flush()
    _recalculate_avg(college)
    db.commit()
    return {"message": "Review deleted."}


@router.get("/{college_id}/reviews")
def get_reviews(
    college_id: str,
    sort: str = "newest",           # newest | highest | lowest
    course: Optional[str] = None,
    page: int = 1,
    limit: int = 10,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    college = _get_or_404(college_id, db)

    query = db.query(models.CollegeReview).filter(
        models.CollegeReview.college_id == college_id
    )

    if course:
        query = query.filter(
            models.CollegeReview.course.ilike(f"%{course}%")
        )

    if sort == "newest":
        query = query.order_by(desc(models.CollegeReview.created_at))
    elif sort == "highest":
        query = query.order_by(desc(models.CollegeReview.rating))
    elif sort == "lowest":
        query = query.order_by(models.CollegeReview.rating)
    else:
        query = query.order_by(desc(models.CollegeReview.created_at))

    total = query.count()
    reviews = query.offset((page - 1) * limit).limit(limit).all()

    # Rating breakdown for sidebar
    all_reviews = college.reviews
    rating_dist = {1: 0, 2: 0, 3: 0, 4: 0, 5: 0}
    for r in all_reviews:
        bucket = min(5, max(1, round(r.rating)))
        rating_dist[bucket] += 1

    return {
        "reviews": [serialize_review(r, current_user, db) for r in reviews],
        "total": total,
        "page": page,
        "pages": (total + limit - 1) // limit,
        "avg_rating": round(college.avg_rating, 1),
        "rating_distribution": rating_dist,
        "total_reviews": len(all_reviews),
    }


# ══════════════════════════════════════════════════════════
# STATS
# ══════════════════════════════════════════════════════════

@router.get("/stats/overview")
def college_stats(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    total_colleges = db.query(models.College).count()
    total_reviews  = db.query(models.CollegeReview).count()
    my_reviews     = db.query(models.CollegeReview).filter(
        models.CollegeReview.author_id == current_user.id
    ).count()

    return {
        "total_colleges": total_colleges,
        "total_reviews": total_reviews,
        "my_reviews": my_reviews,
    }


# ══════════════════════════════════════════════════════════
# INTERNAL HELPERS
# ══════════════════════════════════════════════════════════

def _get_or_404(college_id: str, db: Session) -> models.College:
    college = db.query(models.College).filter(
        models.College.id == college_id
    ).first()
    if not college:
        raise HTTPException(status_code=404, detail="College not found.")
    return college
