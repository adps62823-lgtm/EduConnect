"""
feed_routes.py — Instagram-style Feed Backend
POST   /api/feed/posts
GET    /api/feed/posts
GET    /api/feed/posts/{post_id}
PUT    /api/feed/posts/{post_id}
DELETE /api/feed/posts/{post_id}
POST   /api/feed/posts/{post_id}/like
DELETE /api/feed/posts/{post_id}/like
POST   /api/feed/posts/{post_id}/comments
GET    /api/feed/posts/{post_id}/comments
DELETE /api/feed/posts/{post_id}/comments/{comment_id}
POST   /api/feed/stories
GET    /api/feed/stories
DELETE /api/feed/stories/{story_id}
POST   /api/feed/stories/{story_id}/view
POST   /api/feed/journey
GET    /api/feed/journey/{user_id}
GET    /api/feed/explore
"""

import os
import json
import shutil
from datetime import datetime, timedelta, timezone
from typing import Optional, List

from fastapi import (
    APIRouter, Depends, HTTPException,
    UploadFile, File, Form, Query
)
from pydantic import BaseModel
from sqlalchemy.orm import Session
from sqlalchemy import desc, or_

from database import get_db
from auth import get_current_user, create_notification
import models

router = APIRouter()
UPLOAD_DIR = os.getenv("UPLOAD_DIR", "uploads")


# ══════════════════════════════════════════════════════════
# SCHEMAS
# ══════════════════════════════════════════════════════════

class PostCreate(BaseModel):
    content: str
    post_type: Optional[str] = "feed"       # feed | journey | anonymous
    exam_stream: Optional[str] = None
    is_anonymous: Optional[bool] = False
    tags: Optional[List[str]] = []


class PostUpdate(BaseModel):
    content: Optional[str] = None
    exam_stream: Optional[str] = None
    tags: Optional[List[str]] = None


class CommentCreate(BaseModel):
    content: str
    parent_id: Optional[str] = None


class JourneyCreate(BaseModel):
    week_number: int
    mock_score: Optional[float] = None
    topics_done: Optional[List[str]] = []
    reflection: Optional[str] = None
    goals_next: Optional[str] = None


# ══════════════════════════════════════════════════════════
# SERIALIZERS
# ══════════════════════════════════════════════════════════

def serialize_post(post: models.Post, current_user: models.User) -> dict:
    author = post.author
    is_anon = post.is_anonymous

    return {
        "id": post.id,
        "content": post.content,
        "image_urls": json.loads(post.image_urls) if post.image_urls else [],
        "post_type": post.post_type,
        "exam_stream": post.exam_stream,
        "is_anonymous": post.is_anonymous,
        "views": post.views,
        "created_at": post.created_at.isoformat(),
        "updated_at": post.updated_at.isoformat() if post.updated_at else None,
        "author": {
            "id": author.id if not is_anon else "anonymous",
            "name": author.name if not is_anon else "Anonymous",
            "username": author.username if not is_anon else "anonymous",
            "avatar_url": author.avatar_url if not is_anon else None,
            "exam_target": author.exam_target,
            "study_status": author.study_status,
        },
        "is_mine": author.id == current_user.id,
        "likes_count": len(post.liked_by),
        "is_liked": current_user in post.liked_by,
        "comments_count": len(post.comments),
        "tags": [t.name for t in post.tags],
    }


def serialize_comment(c: models.Comment, current_user: models.User) -> dict:
    return {
        "id": c.id,
        "content": c.content,
        "post_id": c.post_id,
        "parent_id": c.parent_id,
        "created_at": c.created_at.isoformat(),
        "is_mine": c.author_id == current_user.id,
        "author": {
            "id": c.author.id,
            "name": c.author.name,
            "username": c.author.username,
            "avatar_url": c.author.avatar_url,
        },
        "replies": [serialize_comment(r, current_user) for r in c.replies],
    }


def serialize_story(s: models.Story, current_user: models.User) -> dict:
    return {
        "id": s.id,
        "media_url": s.media_url,
        "media_type": s.media_type,
        "caption": s.caption,
        "expires_at": s.expires_at.isoformat(),
        "created_at": s.created_at.isoformat(),
        "is_mine": s.author_id == current_user.id,
        "viewers_count": len(s.viewers),
        "is_viewed": current_user in s.viewers,
        "author": {
            "id": s.author.id,
            "name": s.author.name,
            "username": s.author.username,
            "avatar_url": s.author.avatar_url,
            "study_status": s.author.study_status,
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
# POSTS
# ══════════════════════════════════════════════════════════

@router.post("/posts", status_code=201)
async def create_post(
    content: str = Form(...),
    post_type: str = Form("feed"),
    exam_stream: Optional[str] = Form(None),
    is_anonymous: bool = Form(False),
    tags: Optional[str] = Form("[]"),          # JSON array string
    files: Optional[List[UploadFile]] = File(None),
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    image_urls = []
    if files:
        for f in files:
            if f.filename:
                ext = os.path.splitext(f.filename)[-1].lower() or ".jpg"
                fname = f"{current_user.id}_{datetime.now().timestamp()}{ext}"
                path = os.path.join(UPLOAD_DIR, "posts", fname)
                with open(path, "wb") as out:
                    shutil.copyfileobj(f.file, out)
                image_urls.append(f"/uploads/posts/{fname}")

    post = models.Post(
        author_id=current_user.id,
        content=content,
        post_type=post_type,
        exam_stream=exam_stream or current_user.exam_target,
        is_anonymous=is_anonymous,
        image_urls=json.dumps(image_urls) if image_urls else None,
    )
    db.add(post)
    db.flush()

    tag_list = json.loads(tags) if tags else []
    for tag_name in tag_list:
        post.tags.append(get_or_create_tag(db, tag_name))

    db.commit()
    db.refresh(post)
    return serialize_post(post, current_user)


@router.get("/posts")
def get_feed(
    stream: Optional[str] = None,
    post_type: Optional[str] = None,
    user_id: Optional[str] = None,
    page: int = 1,
    limit: int = 15,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    """
    Main feed: shows posts from followed users + same exam stream.
    Pass ?user_id=xxx to get a specific user's posts (profile view).
    """
    query = db.query(models.Post)

    if user_id:
        query = query.filter(models.Post.author_id == user_id)
    else:
        # Get IDs of users the current user follows
        following_ids = [u.id for u in current_user.following]
        following_ids.append(current_user.id)  # Include own posts

        # Feed = posts from followed users OR same stream
        query = query.filter(
            or_(
                models.Post.author_id.in_(following_ids),
                models.Post.exam_stream == current_user.exam_target,
            )
        )

    if stream:
        query = query.filter(models.Post.exam_stream == stream)
    if post_type:
        query = query.filter(models.Post.post_type == post_type)

    total = query.count()
    posts = (
        query
        .order_by(desc(models.Post.created_at))
        .offset((page - 1) * limit)
        .limit(limit)
        .all()
    )

    return {
        "posts": [serialize_post(p, current_user) for p in posts],
        "total": total,
        "page": page,
        "pages": (total + limit - 1) // limit,
    }


@router.get("/posts/{post_id}")
def get_post(
    post_id: str,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    post = db.query(models.Post).filter(models.Post.id == post_id).first()
    if not post:
        raise HTTPException(status_code=404, detail="Post not found.")
    post.views += 1
    db.commit()
    return serialize_post(post, current_user)


@router.put("/posts/{post_id}")
def update_post(
    post_id: str,
    req: PostUpdate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    post = db.query(models.Post).filter(models.Post.id == post_id).first()
    if not post:
        raise HTTPException(status_code=404, detail="Post not found.")
    if post.author_id != current_user.id:
        raise HTTPException(status_code=403, detail="Not your post.")

    if req.content is not None:
        post.content = req.content
    if req.exam_stream is not None:
        post.exam_stream = req.exam_stream
    if req.tags is not None:
        post.tags.clear()
        for tag_name in req.tags:
            post.tags.append(get_or_create_tag(db, tag_name))

    db.commit()
    db.refresh(post)
    return serialize_post(post, current_user)


@router.delete("/posts/{post_id}")
def delete_post(
    post_id: str,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    post = db.query(models.Post).filter(models.Post.id == post_id).first()
    if not post:
        raise HTTPException(status_code=404, detail="Post not found.")
    if post.author_id != current_user.id and current_user.role != "admin":
        raise HTTPException(status_code=403, detail="Not your post.")
    db.delete(post)
    db.commit()
    return {"message": "Post deleted."}


# ── LIKES ─────────────────────────────────────────────────

@router.post("/posts/{post_id}/like", status_code=201)
def like_post(
    post_id: str,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    post = db.query(models.Post).filter(models.Post.id == post_id).first()
    if not post:
        raise HTTPException(status_code=404, detail="Post not found.")
    if current_user in post.liked_by:
        raise HTTPException(status_code=400, detail="Already liked.")

    post.liked_by.append(current_user)

    if post.author_id != current_user.id:
        create_notification(
            db, post.author_id, "like",
            f"{current_user.name} liked your post.",
            link=f"/feed/post/{post_id}",
        )

    db.commit()
    return {"likes_count": len(post.liked_by)}


@router.delete("/posts/{post_id}/like")
def unlike_post(
    post_id: str,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    post = db.query(models.Post).filter(models.Post.id == post_id).first()
    if not post:
        raise HTTPException(status_code=404, detail="Post not found.")
    if current_user not in post.liked_by:
        raise HTTPException(status_code=400, detail="Not liked yet.")
    post.liked_by.remove(current_user)
    db.commit()
    return {"likes_count": len(post.liked_by)}


# ── COMMENTS ──────────────────────────────────────────────

@router.get("/posts/{post_id}/comments")
def get_comments(
    post_id: str,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    post = db.query(models.Post).filter(models.Post.id == post_id).first()
    if not post:
        raise HTTPException(status_code=404, detail="Post not found.")

    # Only top-level comments (replies nested inside)
    top_level = (
        db.query(models.Comment)
        .filter(
            models.Comment.post_id == post_id,
            models.Comment.parent_id == None,
        )
        .order_by(models.Comment.created_at)
        .all()
    )
    return [serialize_comment(c, current_user) for c in top_level]


@router.post("/posts/{post_id}/comments", status_code=201)
def add_comment(
    post_id: str,
    req: CommentCreate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    post = db.query(models.Post).filter(models.Post.id == post_id).first()
    if not post:
        raise HTTPException(status_code=404, detail="Post not found.")

    comment = models.Comment(
        post_id=post_id,
        author_id=current_user.id,
        content=req.content,
        parent_id=req.parent_id,
    )
    db.add(comment)

    if post.author_id != current_user.id:
        create_notification(
            db, post.author_id, "comment",
            f"{current_user.name} commented on your post.",
            link=f"/feed/post/{post_id}",
        )

    db.commit()
    db.refresh(comment)
    return serialize_comment(comment, current_user)


@router.delete("/posts/{post_id}/comments/{comment_id}")
def delete_comment(
    post_id: str,
    comment_id: str,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    comment = db.query(models.Comment).filter(
        models.Comment.id == comment_id,
        models.Comment.post_id == post_id,
    ).first()
    if not comment:
        raise HTTPException(status_code=404, detail="Comment not found.")
    if comment.author_id != current_user.id and current_user.role != "admin":
        raise HTTPException(status_code=403, detail="Not your comment.")
    db.delete(comment)
    db.commit()
    return {"message": "Comment deleted."}


# ══════════════════════════════════════════════════════════
# STORIES
# ══════════════════════════════════════════════════════════

@router.post("/stories", status_code=201)
async def create_story(
    caption: Optional[str] = Form(None),
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    ext = os.path.splitext(file.filename)[-1].lower() or ".jpg"
    media_type = "video" if ext in (".mp4", ".mov", ".webm") else "image"
    fname = f"{current_user.id}_{datetime.now().timestamp()}{ext}"
    path = os.path.join(UPLOAD_DIR, "stories", fname)
    with open(path, "wb") as out:
        shutil.copyfileobj(file.file, out)

    story = models.Story(
        author_id=current_user.id,
        media_url=f"/uploads/stories/{fname}",
        media_type=media_type,
        caption=caption,
        expires_at=datetime.now(timezone.utc) + timedelta(hours=24),
    )
    db.add(story)
    db.commit()
    db.refresh(story)
    return serialize_story(story, current_user)


@router.get("/stories")
def get_stories(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    """
    Returns active (non-expired) stories grouped by user.
    Prioritises stories from followed users.
    """
    now = datetime.now(timezone.utc)
    following_ids = [u.id for u in current_user.following]
    following_ids.append(current_user.id)

    stories = (
        db.query(models.Story)
        .filter(models.Story.expires_at > now)
        .order_by(desc(models.Story.created_at))
        .all()
    )

    # Group by author
    grouped: dict[str, dict] = {}
    for s in stories:
        uid = s.author_id
        if uid not in grouped:
            grouped[uid] = {
                "user": {
                    "id": s.author.id,
                    "name": s.author.name,
                    "username": s.author.username,
                    "avatar_url": s.author.avatar_url,
                    "study_status": s.author.study_status,
                },
                "stories": [],
                "has_unviewed": False,
                "is_following": s.author in current_user.following,
            }
        serialized = serialize_story(s, current_user)
        grouped[uid]["stories"].append(serialized)
        if not serialized["is_viewed"]:
            grouped[uid]["has_unviewed"] = True

    # Sort: own stories first, then following, then others
    result = list(grouped.values())
    result.sort(key=lambda g: (
        0 if g["user"]["id"] == current_user.id else
        1 if g["is_following"] else 2
    ))
    return result


@router.post("/stories/{story_id}/view")
def view_story(
    story_id: str,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    story = db.query(models.Story).filter(models.Story.id == story_id).first()
    if not story:
        raise HTTPException(status_code=404, detail="Story not found.")
    if current_user not in story.viewers:
        story.viewers.append(current_user)
        db.commit()
    return {"viewed": True}


@router.delete("/stories/{story_id}")
def delete_story(
    story_id: str,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    story = db.query(models.Story).filter(models.Story.id == story_id).first()
    if not story:
        raise HTTPException(status_code=404, detail="Story not found.")
    if story.author_id != current_user.id and current_user.role != "admin":
        raise HTTPException(status_code=403, detail="Not your story.")
    db.delete(story)
    db.commit()
    return {"message": "Story deleted."}


# ══════════════════════════════════════════════════════════
# JOURNEY POSTS
# ══════════════════════════════════════════════════════════

@router.post("/journey", status_code=201)
def create_journey(
    req: JourneyCreate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    journey = models.JourneyPost(
        author_id=current_user.id,
        week_number=req.week_number,
        mock_score=req.mock_score,
        topics_done=json.dumps(req.topics_done or []),
        reflection=req.reflection,
        goals_next=req.goals_next,
    )
    db.add(journey)
    db.commit()
    db.refresh(journey)
    return _serialize_journey(journey)


@router.get("/journey/{user_id}")
def get_journey(
    user_id: str,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    journeys = (
        db.query(models.JourneyPost)
        .filter(models.JourneyPost.author_id == user_id)
        .order_by(desc(models.JourneyPost.week_number))
        .all()
    )
    return [_serialize_journey(j) for j in journeys]


def _serialize_journey(j: models.JourneyPost) -> dict:
    return {
        "id": j.id,
        "author_id": j.author_id,
        "week_number": j.week_number,
        "mock_score": j.mock_score,
        "topics_done": json.loads(j.topics_done) if j.topics_done else [],
        "reflection": j.reflection,
        "goals_next": j.goals_next,
        "created_at": j.created_at.isoformat(),
    }


# ══════════════════════════════════════════════════════════
# EXPLORE (Trending / Discover)
# ══════════════════════════════════════════════════════════

@router.get("/explore")
def explore(
    stream: Optional[str] = None,
    tag: Optional[str] = None,
    page: int = 1,
    limit: int = 15,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    """
    Explore page — trending posts from everyone, not just followed.
    Sorted by likes + recency.
    """
    query = db.query(models.Post)

    if stream:
        query = query.filter(models.Post.exam_stream == stream)
    if tag:
        query = query.join(models.Post.tags).filter(models.Tag.name == tag.lower())

    # Simple trending: most views in last 7 days
    week_ago = datetime.now(timezone.utc) - timedelta(days=7)
    query = query.filter(models.Post.created_at >= week_ago)

    total = query.count()
    posts = (
        query
        .order_by(desc(models.Post.views), desc(models.Post.created_at))
        .offset((page - 1) * limit)
        .limit(limit)
        .all()
    )

    return {
        "posts": [serialize_post(p, current_user) for p in posts],
        "total": total,
        "page": page,
        "pages": (total + limit - 1) // limit,
    }


# ── TAGS ──────────────────────────────────────────────────

@router.get("/tags")
def get_popular_tags(
    limit: int = 20,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    tags = db.query(models.Tag).limit(limit).all()
    return [{"id": t.id, "name": t.name, "color": t.color} for t in tags]
