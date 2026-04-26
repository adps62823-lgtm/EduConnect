"""help_routes.py — StackOverflow-clone (JSON store)"""
import uuid
from datetime import datetime, timezone
from typing import Optional, List
from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel
import database as db
from auth import get_current_user

router = APIRouter()
def _now(): return datetime.now(timezone.utc).isoformat()

def _fmt_user(uid):
    u = db.find_one("users", id=uid) or {}
    return {"id": u.get("id"), "name": u.get("name"), "username": u.get("username"),
            "avatar_url": u.get("avatar_url"), "reputation": u.get("reputation",0),
            "grade": u.get("grade"), "exam_target": u.get("exam_target")}

def _serialize_q(q, cu):
    answers = db.find_many("answers", question_id=q["id"])
    uv = db.find_one("question_votes", question_id=q["id"], user_id=cu["id"])
    body = q.get("body") or q.get("content") or ""
    return {**q, "author": _fmt_user(q["author_id"]),
            "answers_count": len(answers),
            "is_answered": any(a.get("is_accepted") for a in answers),
            "is_mine": q["author_id"] == cu["id"],
            "user_vote": uv["value"] if uv else 0,
            "my_vote":   uv["value"] if uv else 0,
            "vote_count": q.get("votes", 0),
            "body":     body,
            "content":  body}

def _serialize_a(a, cu):
    uv = db.find_one("answer_votes", answer_id=a["id"], user_id=cu["id"])
    body = a.get("body") or a.get("content") or ""
    return {**a, "author": _fmt_user(a["author_id"]),
            "is_mine": a["author_id"] == cu["id"],
            "user_vote": uv["value"] if uv else 0,
            "my_vote":   uv["value"] if uv else 0,
            "vote_count": a.get("votes", 0),
            "body":      body,
            "content":   body}

class QuestionCreate(BaseModel):
    title:  str
    body:    Optional[str] = None
    content: Optional[str] = None
    subject: Optional[str] = None
    exam_target: Optional[str] = None
    tags:        Optional[List[str]] = []

    @property
    def text(self) -> str:
        return (self.content or self.body or "").strip()

class AnswerCreate(BaseModel):
    body:    Optional[str] = None
    content: Optional[str] = None

    @property
    def text(self) -> str:
        return (self.content or self.body or "").strip()

@router.get("/questions")
def list_questions(page: int=1, limit: int=15, q: Optional[str]=None,
                   subject: Optional[str]=None, exam_target: Optional[str]=None,
                   status: Optional[str]=None,
                   sort: str=Query("newest", enum=["newest","votes","unanswered"]),
                   current_user: dict=Depends(get_current_user)):
    qs = db.find_all("questions")
    if q:           qs = [x for x in qs if q.lower() in x.get("title","").lower() or q.lower() in x.get("body","").lower()]
    if subject:     qs = [x for x in qs if x.get("subject") == subject]
    if exam_target: qs = [x for x in qs if x.get("exam_target") == exam_target]
    if status == "answered":   qs = [x for x in qs if x.get("is_answered")]
    elif status == "open":     qs = [x for x in qs if not x.get("is_answered")]
    if sort == "votes":        qs.sort(key=lambda x: x.get("votes",0), reverse=True)
    elif sort == "unanswered": qs = [x for x in qs if not x.get("is_answered")]; qs.sort(key=lambda x: x["created_at"], reverse=True)
    else:                      qs.sort(key=lambda x: x["created_at"], reverse=True)
    total = len(qs)
    return {"questions": [_serialize_q(x, current_user) for x in qs[(page-1)*limit:page*limit]],
            "total": total, "has_more": page*limit < total}

@router.post("/questions", status_code=201)
def create_question(req: QuestionCreate, current_user: dict=Depends(get_current_user)):
    body = req.text
    if len(req.title.strip()) < 10: raise HTTPException(400, "Title too short (min 10 chars).")
    if len(body) < 20:              raise HTTPException(400, "Body too short (min 20 chars).")
    q = {"id": uuid.uuid4().hex, "author_id": current_user["id"],
         "title": req.title.strip(), "body": body, "content": body,
         "subject": req.subject, "exam_target": req.exam_target,
         "tags": (req.tags or [])[:5], "votes": 0, "is_answered": False, "created_at": _now()}
    db.insert("questions", q)
    return _serialize_q(q, current_user)

@router.get("/questions/{qid}")
def get_question(qid: str, current_user: dict=Depends(get_current_user)):
    q = db.find_one("questions", id=qid)
    if not q: raise HTTPException(404)
    answers = db.find_many("answers", question_id=qid)
    answers.sort(key=lambda a: (a.get("is_accepted",False), a.get("votes",0)), reverse=True)
    return {**_serialize_q(q, current_user), "answers": [_serialize_a(a, current_user) for a in answers]}

@router.delete("/questions/{qid}")
def delete_question(qid: str, current_user: dict=Depends(get_current_user)):
    q = db.find_one("questions", id=qid)
    if not q: raise HTTPException(404)
    if q["author_id"] != current_user["id"]: raise HTTPException(403)
    db.delete_one("questions", qid); db.delete_many("answers", question_id=qid)
    return {"message": "Deleted."}

@router.post("/questions/{qid}/answers", status_code=201)
def add_answer(qid: str, req: AnswerCreate, current_user: dict=Depends(get_current_user)):
    body = req.text
    if len(body) < 10: raise HTTPException(400, "Answer too short.")
    q = db.find_one("questions", id=qid)
    if not q: raise HTTPException(404)
    a = {"id": uuid.uuid4().hex, "question_id": qid, "author_id": current_user["id"],
         "body": body, "content": body, "votes": 0, "is_accepted": False, "created_at": _now()}
    db.insert("answers", a)
    db.update_one("users", current_user["id"], {"reputation": current_user.get("reputation",0)+2})
    if q["author_id"] != current_user["id"]:
        db.insert("notifications", {"id": uuid.uuid4().hex, "user_id": q["author_id"],
                                    "type": "answer", "title": "New answer",
                                    "message": f"{current_user['name']} answered your question.",
                                    "actor_id": current_user["id"], "ref_id": qid,
                                    "is_read": False, "created_at": _now()})
    return _serialize_a(a, current_user)

@router.post("/questions/{qid}/answers/{aid}/vote")
def vote_answer(qid: str, aid: str, value: int=Query(..., ge=-1, le=1),
                current_user: dict=Depends(get_current_user)):
    a = db.find_one("answers", id=aid)
    if not a: raise HTTPException(404)
    if a["author_id"] == current_user["id"]: raise HTTPException(400, "Cannot vote your own answer.")
    existing = db.find_one("answer_votes", answer_id=aid, user_id=current_user["id"])
    old_value = existing["value"] if existing else 0
    if existing:
        if value == 0 or value == old_value: db.delete_one("answer_votes", existing["id"]); new_value = 0
        else: db.update_one("answer_votes", existing["id"], {"value": value}); new_value = value
    else:
        if value != 0: db.insert("answer_votes", {"id": uuid.uuid4().hex, "answer_id": aid, "user_id": current_user["id"], "value": value, "created_at": _now()})
        new_value = value
    delta = new_value - old_value
    new_votes = a.get("votes",0) + delta
    db.update_one("answers", aid, {"votes": new_votes})
    if delta != 0:
        author = db.find_one("users", id=a["author_id"])
        if author:
            rep_delta = 10 if delta > 0 else -2
            db.update_one("users", author["id"], {"reputation": max(0, author.get("reputation",0)+rep_delta)})
    return {"votes": new_votes, "user_vote": new_value,
            "vote_count": new_votes, "my_vote": new_value}

@router.post("/questions/{qid}/answers/{aid}/accept")
def accept_answer(qid: str, aid: str, current_user: dict=Depends(get_current_user)):
    q = db.find_one("questions", id=qid)
    if not q: raise HTTPException(404)
    if q["author_id"] != current_user["id"]: raise HTTPException(403)
    a = db.find_one("answers", id=aid)
    if not a: raise HTTPException(404)
    was_accepted = bool(a.get("is_accepted"))
    # Toggle: clear all and re-set if not previously accepted
    for old in db.find_many("answers", question_id=qid):
        db.update_one("answers", old["id"], {"is_accepted": False})
    if not was_accepted:
        db.update_one("answers", aid, {"is_accepted": True})
        db.update_one("questions", qid, {"is_answered": True})
        author = db.find_one("users", id=a["author_id"])
        if author and a["author_id"] != current_user["id"]:
            db.update_one("users", author["id"], {"reputation": author.get("reputation",0)+15,
                                                   "help_points": author.get("help_points",0)+5})
            db.insert("notifications", {"id": uuid.uuid4().hex, "user_id": a["author_id"],
                                        "type": "accepted", "title": "Answer accepted! ✅",
                                        "message": "Your answer was marked as accepted.",
                                        "actor_id": current_user["id"], "ref_id": qid,
                                        "is_read": False, "created_at": _now()})
        return {"accepted": True, "is_accepted": True}
    else:
        # Was accepted; mark question as not answered if no other accepted answer
        db.update_one("questions", qid, {"is_answered": False})
        return {"accepted": False, "is_accepted": False}

@router.delete("/questions/{qid}/answers/{aid}")
def delete_answer(qid: str, aid: str, current_user: dict=Depends(get_current_user)):
    a = db.find_one("answers", id=aid, question_id=qid)
    if not a: raise HTTPException(404)
    if a["author_id"] != current_user["id"]: raise HTTPException(403)
    db.delete_one("answers", aid)
    db.delete_many("answer_votes", answer_id=aid)
    # Recompute is_answered for the question
    remaining = db.find_many("answers", question_id=qid)
    db.update_one("questions", qid,
                  {"is_answered": any(x.get("is_accepted") for x in remaining)})
    return {"message": "Answer deleted."}

@router.get("/questions/{qid}/senior-match")
def senior_match(qid: str, current_user: dict=Depends(get_current_user)):
    users = [u for u in db.find_all("users") if u["id"] != current_user["id"]]
    users.sort(key=lambda u: u.get("reputation",0), reverse=True)
    return [{"id": u["id"], "name": u["name"], "username": u["username"],
             "avatar_url": u.get("avatar_url"), "reputation": u.get("reputation",0),
             "exam_target": u.get("exam_target"), "grade": u.get("grade")} for u in users[:5]]
