"""mentor_routes.py — LinkedIn-style mentor discovery (JSON store)"""
import uuid
from datetime import datetime, timezone
from typing import Optional, List
from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel
import database as db
from auth import get_current_user

router = APIRouter()
def _now(): return datetime.now(timezone.utc).isoformat()

def _serialize_mentor(m, cu):
    user = db.find_one("users", id=m["user_id"]) or {}
    reviews = db.find_many("mentor_reviews", mentor_id=m["id"])
    avg_rating = round(sum(r.get("rating",0) for r in reviews)/len(reviews),1) if reviews else 0
    conn = db.find_one("mentor_connections", mentor_id=m["id"], mentee_id=cu["id"])
    return {**m,
            "user": {"id": user.get("id"), "name": user.get("name"), "username": user.get("username"),
                     "avatar_url": user.get("avatar_url"), "grade": user.get("grade"), "school": user.get("school")},
            "avg_rating": avg_rating, "reviews_count": len(reviews),
            "connection_status": conn["status"] if conn else None,
            "is_mine": m["user_id"] == cu["id"]}

class MentorProfileCreate(BaseModel):
    subjects: List[str]; exams: List[str]; bio: str
    achievements: Optional[str] = None; availability: Optional[str] = None
    hourly_rate: Optional[float] = 0

class ReviewCreate(BaseModel):
    rating: int; comment: str

@router.get("/profiles")
def list_mentors(subject: Optional[str]=None, exam: Optional[str]=None,
                 page: int=1, limit: int=12, current_user: dict=Depends(get_current_user)):
    mentors = db.find_all("mentor_profiles")
    if subject: mentors = [m for m in mentors if subject in m.get("subjects",[])]
    if exam:    mentors = [m for m in mentors if exam in m.get("exams",[])]
    mentors.sort(key=lambda m: len(db.find_many("mentor_connections", mentor_id=m["id"])), reverse=True)
    total = len(mentors)
    return {"mentors": [_serialize_mentor(m, current_user) for m in mentors[(page-1)*limit:page*limit]],
            "total": total, "has_more": page*limit < total}

@router.post("/profiles", status_code=201)
def create_mentor_profile(req: MentorProfileCreate, current_user: dict=Depends(get_current_user)):
    if db.exists("mentor_profiles", user_id=current_user["id"]):
        raise HTTPException(409, "Mentor profile already exists.")
    m = {"id": uuid.uuid4().hex, "user_id": current_user["id"],
         "subjects": req.subjects, "exams": req.exams, "bio": req.bio,
         "achievements": req.achievements, "availability": req.availability,
         "hourly_rate": req.hourly_rate or 0, "created_at": _now()}
    db.insert("mentor_profiles", m)
    db.update_one("users", current_user["id"], {"role": "mentor"})
    return _serialize_mentor(m, current_user)

@router.get("/profiles/me")
def get_my_profile(current_user: dict=Depends(get_current_user)):
    m = db.find_one("mentor_profiles", user_id=current_user["id"])
    if not m: raise HTTPException(404, "No mentor profile.")
    return _serialize_mentor(m, current_user)

@router.get("/profiles/{mentor_id}")
def get_mentor(mentor_id: str, current_user: dict=Depends(get_current_user)):
    m = db.find_one("mentor_profiles", id=mentor_id)
    if not m: raise HTTPException(404)
    reviews = db.find_many("mentor_reviews", mentor_id=mentor_id)
    result = _serialize_mentor(m, current_user)
    result["reviews"] = reviews
    return result

@router.post("/connect/{mentor_id}")
def request_connection(mentor_id: str, current_user: dict=Depends(get_current_user)):
    m = db.find_one("mentor_profiles", id=mentor_id)
    if not m: raise HTTPException(404)
    if db.exists("mentor_connections", mentor_id=mentor_id, mentee_id=current_user["id"]):
        raise HTTPException(409, "Already requested.")
    conn = {"id": uuid.uuid4().hex, "mentor_id": mentor_id,
            "mentee_id": current_user["id"], "status": "pending", "created_at": _now()}
    db.insert("mentor_connections", conn)
    db.insert("notifications", {"id": uuid.uuid4().hex, "user_id": m["user_id"],
                                 "type": "mentor_request", "title": "New mentorship request",
                                 "message": f"{current_user['name']} wants you as a mentor.",
                                 "actor_id": current_user["id"], "ref_id": mentor_id,
                                 "is_read": False, "created_at": _now()})
    return {"status": "pending"}

@router.post("/connect/{connection_id}/respond")
def respond_connection(connection_id: str, accept: bool=Query(...),
                       current_user: dict=Depends(get_current_user)):
    conn = db.find_one("mentor_connections", id=connection_id)
    if not conn: raise HTTPException(404)
    m = db.find_one("mentor_profiles", id=conn["mentor_id"])
    if not m or m["user_id"] != current_user["id"]: raise HTTPException(403)
    status = "accepted" if accept else "rejected"
    db.update_one("mentor_connections", connection_id, {"status": status})
    return {"status": status}

@router.get("/my-connections")
def my_connections(current_user: dict=Depends(get_current_user)):
    m = db.find_one("mentor_profiles", user_id=current_user["id"])
    if m:
        conns = db.find_many("mentor_connections", mentor_id=m["id"])
    else:
        conns = db.find_many("mentor_connections", mentee_id=current_user["id"])
    return conns

@router.post("/profiles/{mentor_id}/reviews", status_code=201)
def add_review(mentor_id: str, req: ReviewCreate, current_user: dict=Depends(get_current_user)):
    if not 1 <= req.rating <= 5: raise HTTPException(400, "Rating must be 1–5.")
    if db.exists("mentor_reviews", mentor_id=mentor_id, reviewer_id=current_user["id"]):
        raise HTTPException(409, "Already reviewed.")
    review = {"id": uuid.uuid4().hex, "mentor_id": mentor_id, "reviewer_id": current_user["id"],
              "rating": req.rating, "comment": req.comment, "created_at": _now()}
    db.insert("mentor_reviews", review)
    return review
