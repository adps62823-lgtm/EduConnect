"""college_routes.py — College reviews (JSON store)"""
import uuid
from datetime import datetime, timezone
from typing import Optional, List
from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel
import database as db
from auth import get_current_user

router = APIRouter()
def _now(): return datetime.now(timezone.utc).isoformat()

def _serialize_college(c, cu):
    reviews = db.find_many("college_reviews", college_id=c["id"])
    avg = round(sum(r.get("rating",0) for r in reviews)/len(reviews),1) if reviews else 0
    dist = {1:0, 2:0, 3:0, 4:0, 5:0}
    for r in reviews: dist[r.get("rating",1)] = dist.get(r.get("rating",1),0)+1
    my_review = db.find_one("college_reviews", college_id=c["id"], reviewer_id=cu["id"])
    return {**c, "avg_rating": avg, "reviews_count": len(reviews),
            "rating_distribution": dist, "my_review": my_review}

class CollegeReview(BaseModel):
    rating: int
    title: Optional[str]=None
    pros: Optional[str]=None; cons: Optional[str]=None
    academics: Optional[int]=None; placements: Optional[int]=None
    campus_life: Optional[int]=None; faculty: Optional[int]=None
    course: Optional[str]=None; year: Optional[str]=None

@router.get("")
def list_colleges(page: int=1, limit: int=20, q: Optional[str]=None,
                  sort: str=Query("rating", enum=["rating","reviews","name"]),
                  current_user: dict=Depends(get_current_user)):
    colleges = db.find_all("colleges")
    if q: colleges = [c for c in colleges if q.lower() in c.get("name","").lower() or q.lower() in c.get("city","").lower()]
    if sort == "rating":
        colleges.sort(key=lambda c: sum(r.get("rating",0) for r in db.find_many("college_reviews",college_id=c["id"]))/max(len(db.find_many("college_reviews",college_id=c["id"])),1), reverse=True)
    elif sort == "reviews":
        colleges.sort(key=lambda c: len(db.find_many("college_reviews", college_id=c["id"])), reverse=True)
    else:
        colleges.sort(key=lambda c: c.get("name",""))
    total = len(colleges)
    return {"colleges": [_serialize_college(c, current_user) for c in colleges[(page-1)*limit:page*limit]],
            "total": total, "has_more": page*limit < total}

class CollegeCreate(BaseModel):
    name: str; city: str; state: Optional[str]=None
    type: Optional[str]=None; website: Optional[str]=None

@router.post("", status_code=201)
def create_college(req: CollegeCreate, current_user: dict=Depends(get_current_user)):
    if db.exists("colleges", name=req.name):
        raise HTTPException(409, "College already exists.")
    c = {"id": uuid.uuid4().hex, "name": req.name, "city": req.city,
         "state": req.state, "type": req.type, "website": req.website,
         "created_by": current_user["id"], "created_at": _now()}
    db.insert("colleges", c)
    return _serialize_college(c, current_user)

@router.get("/{college_id}")
def get_college(college_id: str, current_user: dict=Depends(get_current_user)):
    c = db.find_one("colleges", id=college_id)
    if not c: raise HTTPException(404)
    reviews = db.find_many("college_reviews", college_id=college_id)
    reviews.sort(key=lambda r: r["created_at"], reverse=True)
    serialized = _serialize_college(c, current_user)
    result_reviews = []
    for r in reviews[:20]:
        reviewer = db.find_one("users", id=r["reviewer_id"]) or {}
        result_reviews.append({**r,
            "reviewer": {"id": reviewer.get("id"), "name": reviewer.get("name"),
                         "username": reviewer.get("username"), "avatar_url": reviewer.get("avatar_url")}})
    serialized["reviews"] = result_reviews
    return serialized

@router.post("/{college_id}/reviews", status_code=201)
def add_review(college_id: str, req: CollegeReview, current_user: dict=Depends(get_current_user)):
    if not 1 <= req.rating <= 5: raise HTTPException(400, "Rating must be 1–5.")
    if not db.find_one("colleges", id=college_id): raise HTTPException(404)
    if db.exists("college_reviews", college_id=college_id, reviewer_id=current_user["id"]):
        raise HTTPException(409, "You have already reviewed this college.")
    review = {"id": uuid.uuid4().hex, "college_id": college_id,
              "reviewer_id": current_user["id"], "rating": req.rating,
              "title": req.title, "pros": req.pros, "cons": req.cons,
              "academics": req.academics, "placements": req.placements,
              "campus_life": req.campus_life, "faculty": req.faculty,
              "course": req.course, "year": req.year, "created_at": _now()}
    db.insert("college_reviews", review)
    return review

@router.put("/{college_id}/reviews/{review_id}")
def update_review(college_id: str, review_id: str, req: CollegeReview,
                  current_user: dict=Depends(get_current_user)):
    review = db.find_one("college_reviews", id=review_id, college_id=college_id)
    if not review: raise HTTPException(404)
    if review["reviewer_id"] != current_user["id"]: raise HTTPException(403)
    updates = {k:v for k,v in req.dict().items() if v is not None}
    return db.update_one("college_reviews", review_id, updates)

@router.delete("/{college_id}/reviews/{review_id}")
def delete_review(college_id: str, review_id: str, current_user: dict=Depends(get_current_user)):
    review = db.find_one("college_reviews", id=review_id, college_id=college_id)
    if not review: raise HTTPException(404)
    if review["reviewer_id"] != current_user["id"]: raise HTTPException(403)
    db.delete_one("college_reviews", review_id)
    return {"message": "Deleted."}
