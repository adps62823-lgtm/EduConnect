"""
help_routes.py — Stack Overflow-style Academic Help Forum
POST   /api/help/questions
GET    /api/help/questions
GET    /api/help/questions/{q_id}
PUT    /api/help/questions/{q_id}
DELETE /api/help/questions/{q_id}
POST   /api/help/questions/{q_id}/answers
PUT    /api/help/answers/{a_id}
DELETE /api/help/answers/{a_id}
POST   /api/help/answers/{a_id}/vote
POST   /api/help/answers/{a_id}/accept
GET    /api/help/questions/{q_id}/matches   ← senior matcher
GET    /api/help/tags
GET    /api/help/users/{user_id}/stats
"""

import json
from typing import Optional, List
from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel
from sqlalchemy.orm import Session
from sqlalchemy import desc, func, or_

from database import get_db
from auth import get_current_user, create_notification
import models

router = APIRouter()


# ══════════════════════════════════════════════════════════
# SCHEMAS
# ══════════════════════════════════════════════════════════

class QuestionCreate(BaseModel):
    title: str
    body: str
    subject: Optional[str] = None
    exam_target: Optional[str] = None
    is_anonymous: bool = False
    tags: Optional[List[str]] = []


class QuestionUpdate(BaseModel):
    title: Optional[str] = None
    body: Optional[str] = None
    subject: Optional[str] = None
    tags: Optional[List[str]] = None


class AnswerCreate(BaseModel):
    content: str


class AnswerUpdate(BaseModel):
    content: str


class VoteRequest(BaseModel):
    direction: int   # +1 or -1


# ══════════════════════════════════════════════════════════
# SERIALIZERS
# ══════════════════════════════════════════════════════════

def serialize_question(
    q: models.HelpRequest,
    current_user: models.User,
    include_answers: bool = False,
) -> dict:
    is_anon = q.is_anonymous
    author = q.author

    data = {
        "id": q.id,
        "title": q.title,
        "body": q.body,
        "subject": q.subject,
        "exam_target": q.exam_target,
        "is_anonymous": q.is_anonymous,
        "status": q.status,
        "views": q.views,
        "created_at": q.created_at.isoformat(),
        "updated_at": q.updated_at.isoformat() if q.updated_at else None,
        "tags": [t.name for t in q.tags],
        "answers_count": len(q.answers),
        "is_mine": author.id == current_user.id,
        "author": {
            "id": author.id if not is_anon else "anonymous",
            "name": author.name if not is_anon else "Anonymous",
            "username": author.username if not is_anon else "anonymous",
            "avatar_url": author.avatar_url if not is_anon else None,
            "reputation": author.reputation,
            "exam_target": author.exam_target,
        },
        "has_accepted_answer": any(a.is_accepted for a in q.answers),
    }

    if include_answers:
        data["answers"] = [
            serialize_answer(a, current_user) for a in
            sorted(q.answers, key=lambda a: (-a.is_accepted, -a.vote_count))
        ]

    return data


def serialize_answer(a: models.Answer, current_user: models.User) -> dict:
    return {
        "id": a.id,
        "question_id": a.question_id,
        "content": a.content,
        "is_accepted": a.is_accepted,
        "vote_count": a.vote_count,
        "created_at": a.created_at.isoformat(),
        "updated_at": a.updated_at.isoformat() if a.updated_at else None,
        "is_mine": a.author_id == current_user.id,
        "author": {
            "id": a.author.id,
            "name": a.author.name,
            "username": a.author.username,
            "avatar_url": a.author.avatar_url,
            "reputation": a.author.reputation,
            "exam_target": a.author.exam_target,
            "help_points": a.author.help_points,
        },
    }


def get_or_create_tag(db: Session, name: str) -> models.Tag:
    name = name.strip().lower()
    tag = db.query(models.Tag).filter(models.Tag.name == name).first()
    if not tag:
        tag = models.Tag(name=name)
        db.add(tag)
        db.flush()
    return tag


# ══════════════════════════════════════════════════════════
# QUESTIONS
# ══════════════════════════════════════════════════════════

@router.post("/questions", status_code=201)
def create_question(
    req: QuestionCreate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    if len(req.title.strip()) < 10:
        raise HTTPException(status_code=400, detail="Title must be at least 10 characters.")
    if len(req.body.strip()) < 20:
        raise HTTPException(status_code=400, detail="Body must be at least 20 characters.")

    question = models.HelpRequest(
        author_id=current_user.id,
        title=req.title.strip(),
        body=req.body.strip(),
        subject=req.subject,
        exam_target=req.exam_target or current_user.exam_target,
        is_anonymous=req.is_anonymous,
    )
    db.add(question)
    db.flush()

    for tag_name in (req.tags or []):
        question.tags.append(get_or_create_tag(db, tag_name))

    db.commit()
    db.refresh(question)
    return serialize_question(question, current_user)


@router.get("/questions")
def list_questions(
    q: Optional[str] = None,
    subject: Optional[str] = None,
    exam_target: Optional[str] = None,
    tag: Optional[str] = None,
    status: Optional[str] = None,
    sort: str = "newest",          # newest | votes | unanswered | bounty
    page: int = 1,
    limit: int = 15,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    query = db.query(models.HelpRequest)

    # Filters
    if q:
        like = f"%{q}%"
        query = query.filter(
            or_(
                models.HelpRequest.title.ilike(like),
                models.HelpRequest.body.ilike(like),
            )
        )
    if subject:
        query = query.filter(models.HelpRequest.subject == subject)
    if exam_target:
        query = query.filter(models.HelpRequest.exam_target == exam_target)
    if status:
        query = query.filter(models.HelpRequest.status == status)
    if tag:
        query = query.join(models.HelpRequest.tags).filter(
            models.Tag.name == tag.lower()
        )

    # Sorting
    if sort == "newest":
        query = query.order_by(desc(models.HelpRequest.created_at))
    elif sort == "unanswered":
        query = query.filter(models.HelpRequest.status == "open").order_by(
            desc(models.HelpRequest.created_at)
        )
    elif sort == "views":
        query = query.order_by(desc(models.HelpRequest.views))
    else:
        query = query.order_by(desc(models.HelpRequest.created_at))

    total = query.count()
    questions = (
        query
        .offset((page - 1) * limit)
        .limit(limit)
        .all()
    )

    return {
        "questions": [serialize_question(q, current_user) for q in questions],
        "total": total,
        "page": page,
        "pages": (total + limit - 1) // limit,
    }


@router.get("/questions/{q_id}")
def get_question(
    q_id: str,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    question = db.query(models.HelpRequest).filter(
        models.HelpRequest.id == q_id
    ).first()
    if not question:
        raise HTTPException(status_code=404, detail="Question not found.")

    question.views += 1
    db.commit()

    return serialize_question(question, current_user, include_answers=True)


@router.put("/questions/{q_id}")
def update_question(
    q_id: str,
    req: QuestionUpdate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    question = db.query(models.HelpRequest).filter(
        models.HelpRequest.id == q_id
    ).first()
    if not question:
        raise HTTPException(status_code=404, detail="Question not found.")
    if question.author_id != current_user.id:
        raise HTTPException(status_code=403, detail="Not your question.")

    if req.title is not None:
        question.title = req.title
    if req.body is not None:
        question.body = req.body
    if req.subject is not None:
        question.subject = req.subject
    if req.tags is not None:
        question.tags.clear()
        for tag_name in req.tags:
            question.tags.append(get_or_create_tag(db, tag_name))

    db.commit()
    db.refresh(question)
    return serialize_question(question, current_user, include_answers=True)


@router.delete("/questions/{q_id}")
def delete_question(
    q_id: str,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    question = db.query(models.HelpRequest).filter(
        models.HelpRequest.id == q_id
    ).first()
    if not question:
        raise HTTPException(status_code=404, detail="Question not found.")
    if question.author_id != current_user.id and current_user.role != "admin":
        raise HTTPException(status_code=403, detail="Not your question.")

    db.delete(question)
    db.commit()
    return {"message": "Question deleted."}


# ══════════════════════════════════════════════════════════
# ANSWERS
# ══════════════════════════════════════════════════════════

@router.post("/questions/{q_id}/answers", status_code=201)
def post_answer(
    q_id: str,
    req: AnswerCreate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    question = db.query(models.HelpRequest).filter(
        models.HelpRequest.id == q_id
    ).first()
    if not question:
        raise HTTPException(status_code=404, detail="Question not found.")
    if question.status == "closed":
        raise HTTPException(status_code=400, detail="Question is closed.")

    # Prevent duplicate answers from same user
    existing = db.query(models.Answer).filter(
        models.Answer.question_id == q_id,
        models.Answer.author_id == current_user.id,
    ).first()
    if existing:
        raise HTTPException(
            status_code=400,
            detail="You have already answered this question. Edit your existing answer."
        )

    answer = models.Answer(
        question_id=q_id,
        author_id=current_user.id,
        content=req.content.strip(),
    )
    db.add(answer)

    # Update question status
    if question.status == "open":
        question.status = "answered"

    # Reward answerer with help points
    current_user.help_points += 2
    current_user.reputation += 5

    # Notify question author
    if question.author_id != current_user.id:
        create_notification(
            db, question.author_id, "answer",
            f"{current_user.name} answered your question: \"{question.title[:60]}\"",
            link=f"/help/{q_id}",
        )

    db.commit()
    db.refresh(answer)
    return serialize_answer(answer, current_user)


@router.put("/answers/{a_id}")
def update_answer(
    a_id: str,
    req: AnswerUpdate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    answer = db.query(models.Answer).filter(models.Answer.id == a_id).first()
    if not answer:
        raise HTTPException(status_code=404, detail="Answer not found.")
    if answer.author_id != current_user.id:
        raise HTTPException(status_code=403, detail="Not your answer.")

    answer.content = req.content.strip()
    db.commit()
    db.refresh(answer)
    return serialize_answer(answer, current_user)


@router.delete("/answers/{a_id}")
def delete_answer(
    a_id: str,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    answer = db.query(models.Answer).filter(models.Answer.id == a_id).first()
    if not answer:
        raise HTTPException(status_code=404, detail="Answer not found.")
    if answer.author_id != current_user.id and current_user.role != "admin":
        raise HTTPException(status_code=403, detail="Not your answer.")

    db.delete(answer)
    db.commit()
    return {"message": "Answer deleted."}


# ── VOTE ON ANSWER ────────────────────────────────────────

@router.post("/answers/{a_id}/vote")
def vote_answer(
    a_id: str,
    req: VoteRequest,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    if req.direction not in (1, -1):
        raise HTTPException(status_code=400, detail="Vote must be +1 or -1.")

    answer = db.query(models.Answer).filter(models.Answer.id == a_id).first()
    if not answer:
        raise HTTPException(status_code=404, detail="Answer not found.")
    if answer.author_id == current_user.id:
        raise HTTPException(status_code=400, detail="Cannot vote on your own answer.")

    # Check existing vote in association table
    existing = db.execute(
        models.answer_votes.select().where(
            models.answer_votes.c.user_id == current_user.id,
            models.answer_votes.c.answer_id == a_id,
        )
    ).first()

    if existing:
        if existing.vote == req.direction:
            # Remove vote (toggle off)
            db.execute(
                models.answer_votes.delete().where(
                    models.answer_votes.c.user_id == current_user.id,
                    models.answer_votes.c.answer_id == a_id,
                )
            )
            answer.vote_count -= req.direction
            answer.author.reputation -= req.direction * 10
        else:
            # Change vote direction
            db.execute(
                models.answer_votes.update()
                .where(
                    models.answer_votes.c.user_id == current_user.id,
                    models.answer_votes.c.answer_id == a_id,
                )
                .values(vote=req.direction)
            )
            answer.vote_count += req.direction * 2
            answer.author.reputation += req.direction * 20
    else:
        # New vote
        db.execute(
            models.answer_votes.insert().values(
                user_id=current_user.id,
                answer_id=a_id,
                vote=req.direction,
            )
        )
        answer.vote_count += req.direction
        answer.author.reputation += req.direction * 10

        if req.direction == 1 and answer.author_id != current_user.id:
            create_notification(
                db, answer.author_id, "upvote",
                f"{current_user.name} upvoted your answer.",
                link=f"/help/{answer.question_id}",
            )

    db.commit()
    return {"vote_count": answer.vote_count}


# ── ACCEPT ANSWER ────────────────────────────────────────

@router.post("/answers/{a_id}/accept")
def accept_answer(
    a_id: str,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    answer = db.query(models.Answer).filter(models.Answer.id == a_id).first()
    if not answer:
        raise HTTPException(status_code=404, detail="Answer not found.")

    question = db.query(models.HelpRequest).filter(
        models.HelpRequest.id == answer.question_id
    ).first()

    if question.author_id != current_user.id:
        raise HTTPException(
            status_code=403,
            detail="Only the question author can accept an answer."
        )

    # Un-accept any previously accepted answer
    for a in question.answers:
        if a.is_accepted and a.id != a_id:
            a.is_accepted = False
            a.author.reputation -= 15
            a.author.help_points -= 5

    # Toggle accept on this answer
    if answer.is_accepted:
        answer.is_accepted = False
        answer.author.reputation -= 15
        answer.author.help_points -= 5
        question.status = "answered"
    else:
        answer.is_accepted = True
        answer.author.reputation += 15
        answer.author.help_points += 5
        question.status = "closed"

        create_notification(
            db, answer.author_id, "accepted",
            f"Your answer was accepted! ✅ +15 reputation",
            link=f"/help/{question.id}",
        )

    db.commit()
    return {"is_accepted": answer.is_accepted, "question_status": question.status}


# ══════════════════════════════════════════════════════════
# SENIOR MATCHER
# Finds users who previously answered questions with
# similar tags/subject — the "I Need Help" matching system
# ══════════════════════════════════════════════════════════

@router.get("/questions/{q_id}/matches")
def get_senior_matches(
    q_id: str,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    """
    Returns top 5 seniors/users who have answered questions
    with the same tags or subject as this question.
    Ranked by: accepted answers > total answers > reputation.
    """
    question = db.query(models.HelpRequest).filter(
        models.HelpRequest.id == q_id
    ).first()
    if not question:
        raise HTTPException(status_code=404, detail="Question not found.")

    tag_names = [t.name for t in question.tags]

    # Find answers on questions with matching tags or subject
    matching_answers = (
        db.query(models.Answer)
        .join(models.HelpRequest, models.Answer.question_id == models.HelpRequest.id)
        .filter(
            models.Answer.author_id != current_user.id,
            or_(
                models.HelpRequest.subject == question.subject,
                models.HelpRequest.tags.any(
                    models.Tag.name.in_(tag_names)
                ) if tag_names else False,
            )
        )
        .all()
    )

    # Score each user
    scores: dict[str, dict] = {}
    for ans in matching_answers:
        uid = ans.author_id
        if uid not in scores:
            scores[uid] = {
                "user": ans.author,
                "total_answers": 0,
                "accepted_answers": 0,
                "score": 0,
            }
        scores[uid]["total_answers"] += 1
        scores[uid]["score"] += 1
        if ans.is_accepted:
            scores[uid]["accepted_answers"] += 1
            scores[uid]["score"] += 3

    # Sort and return top 5
    ranked = sorted(scores.values(), key=lambda x: -x["score"])[:5]

    return [
        {
            "id": r["user"].id,
            "name": r["user"].name,
            "username": r["user"].username,
            "avatar_url": r["user"].avatar_url,
            "exam_target": r["user"].exam_target,
            "reputation": r["user"].reputation,
            "help_points": r["user"].help_points,
            "total_answers": r["total_answers"],
            "accepted_answers": r["accepted_answers"],
            "match_score": r["score"],
        }
        for r in ranked
    ]


# ══════════════════════════════════════════════════════════
# TAGS
# ══════════════════════════════════════════════════════════

@router.get("/tags")
def get_tags(
    q: Optional[str] = None,
    limit: int = 30,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    query = db.query(models.Tag)
    if q:
        query = query.filter(models.Tag.name.ilike(f"%{q}%"))
    tags = query.limit(limit).all()
    return [{"id": t.id, "name": t.name, "color": t.color} for t in tags]


# ══════════════════════════════════════════════════════════
# USER FORUM STATS
# ══════════════════════════════════════════════════════════

@router.get("/users/{user_id}/stats")
def get_user_stats(
    user_id: str,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    """Forum stats for a user's profile page."""
    user = db.query(models.User).filter(models.User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found.")

    questions_asked = db.query(models.HelpRequest).filter(
        models.HelpRequest.author_id == user_id
    ).count()

    answers_given = db.query(models.Answer).filter(
        models.Answer.author_id == user_id
    ).count()

    accepted_answers = db.query(models.Answer).filter(
        models.Answer.author_id == user_id,
        models.Answer.is_accepted == True,
    ).count()

    total_votes = sum(
        a.vote_count for a in
        db.query(models.Answer).filter(models.Answer.author_id == user_id).all()
    )

    return {
        "user_id": user_id,
        "reputation": user.reputation,
        "help_points": user.help_points,
        "questions_asked": questions_asked,
        "answers_given": answers_given,
        "accepted_answers": accepted_answers,
        "acceptance_rate": (
            round(accepted_answers / answers_given * 100, 1)
            if answers_given > 0 else 0
        ),
        "total_upvotes_received": total_votes,
    }
