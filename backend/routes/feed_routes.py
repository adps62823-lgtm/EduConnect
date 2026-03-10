"""feed_routes.py — Instagram-clone feed (JSON store)"""
import os, uuid, shutil, json
from datetime import datetime, timezone, timedelta
from typing import Optional, List
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form, Query
from pydantic import BaseModel
import database as db
from auth import get_current_user

router = APIRouter()
UPLOAD_DIR = os.getenv("UPLOAD_DIR", "uploads")
def _now(): return datetime.now(timezone.utc).isoformat()

def _save_upload(file, subfolder):
    ext = os.path.splitext(file.filename)[-1].lower() or ".bin"
    fname = f"{uuid.uuid4().hex}{ext}"
    folder = os.path.join(UPLOAD_DIR, subfolder)
    os.makedirs(folder, exist_ok=True)
    with open(os.path.join(folder, fname), "wb") as out:
        shutil.copyfileobj(file.file, out)
    return f"/uploads/{subfolder}/{fname}"

def _serialize_post(post, current_user):
    likes    = db.find_many("post_likes", post_id=post["id"])
    comments = db.find_many("comments",   post_id=post["id"])
    is_liked = any(l["user_id"] == current_user["id"] for l in likes)
    author = None
    if not post.get("is_anonymous"):
        u = db.find_one("users", id=post["author_id"])
        if u:
            author = {"id": u["id"], "name": u["name"], "username": u["username"],
                      "avatar_url": u.get("avatar_url"), "grade": u.get("grade"),
                      "exam_target": u.get("exam_target")}
    return {"id": post["id"], "content": post.get("content",""),
            "images": post.get("images",[]), "tags": post.get("tags",[]),
            "subject": post.get("subject"), "exam_tag": post.get("exam_tag"),
            "is_anonymous": post.get("is_anonymous", False),
            "author": author, "author_id": post["author_id"],
            "is_mine": post["author_id"] == current_user["id"],
            "likes_count": len(likes), "comments_count": len(comments),
            "is_liked": is_liked, "created_at": post["created_at"]}

@router.post("/posts", status_code=201)
async def create_post(
    content: str = Form(""), subject: str = Form(""), exam_tag: str = Form(""),
    tags: str = Form("[]"), is_anonymous: bool = Form(False),
    images: List[UploadFile] = File(default=[]),
    current_user: dict = Depends(get_current_user),
):
    if not content.strip() and not images:
        raise HTTPException(400, "Post must have content or at least one image.")
    try: tags_list = json.loads(tags)
    except: tags_list = []
    image_urls = [_save_upload(img, "posts") for img in images if img.filename]
    post = {"id": uuid.uuid4().hex, "author_id": current_user["id"],
            "content": content.strip(), "images": image_urls, "tags": tags_list[:10],
            "subject": subject.strip() or None, "exam_tag": exam_tag.strip() or None,
            "is_anonymous": is_anonymous, "created_at": _now()}
    db.insert("posts", post)
    return _serialize_post(post, current_user)

@router.get("/posts")
def get_feed(
    feed_type: str = Query("following", enum=["following","trending","anonymous"]),
    page: int = Query(1, ge=1), limit: int = Query(15, ge=1, le=50),
    tag: Optional[str] = None, subject: Optional[str] = None,
    current_user: dict = Depends(get_current_user),
):
    all_posts = db.find_all("posts")
    if feed_type == "following":
        follows = db.find_many("follows", follower_id=current_user["id"])
        ids = {f["following_id"] for f in follows} | {current_user["id"]}
        posts = [p for p in all_posts if p["author_id"] in ids and not p.get("is_anonymous")]
    elif feed_type == "trending":
        posts = [p for p in all_posts if not p.get("is_anonymous")]
        posts.sort(key=lambda p: len(db.find_many("post_likes", post_id=p["id"])), reverse=True)
    else:
        posts = [p for p in all_posts if p.get("is_anonymous")]
    if tag:     posts = [p for p in posts if tag in p.get("tags",[])]
    if subject: posts = [p for p in posts if p.get("subject") == subject]
    if feed_type != "trending": posts.sort(key=lambda p: p["created_at"], reverse=True)
    total = len(posts)
    return {"posts": [_serialize_post(p, current_user) for p in posts[(page-1)*limit:page*limit]],
            "total": total, "page": page, "has_more": page*limit < total}

@router.delete("/posts/{post_id}")
def delete_post(post_id: str, current_user: dict = Depends(get_current_user)):
    post = db.find_one("posts", id=post_id)
    if not post: raise HTTPException(404)
    if post["author_id"] != current_user["id"]: raise HTTPException(403)
    db.delete_one("posts", post_id)
    db.delete_many("post_likes", post_id=post_id)
    db.delete_many("comments",   post_id=post_id)
    return {"message": "Deleted."}

@router.post("/posts/{post_id}/like")
def toggle_like(post_id: str, current_user: dict = Depends(get_current_user)):
    post = db.find_one("posts", id=post_id)
    if not post: raise HTTPException(404)
    existing = db.find_one("post_likes", post_id=post_id, user_id=current_user["id"])
    count = len(db.find_many("post_likes", post_id=post_id))
    if existing:
        db.delete_one("post_likes", existing["id"])
        return {"liked": False, "likes_count": count - 1}
    db.insert("post_likes", {"id": uuid.uuid4().hex, "post_id": post_id,
                              "user_id": current_user["id"], "created_at": _now()})
    if post["author_id"] != current_user["id"] and not post.get("is_anonymous"):
        db.insert("notifications", {"id": uuid.uuid4().hex, "user_id": post["author_id"],
                                    "type": "like", "title": "New like",
                                    "message": f"{current_user['name']} liked your post.",
                                    "actor_id": current_user["id"], "ref_id": post_id,
                                    "is_read": False, "created_at": _now()})
    return {"liked": True, "likes_count": count + 1}

@router.get("/posts/{post_id}/comments")
def get_comments(post_id: str, page: int = 1, limit: int = 20,
                 current_user: dict = Depends(get_current_user)):
    comments = sorted(db.find_many("comments", post_id=post_id), key=lambda c: c["created_at"])
    total = len(comments)
    result = []
    for c in comments[(page-1)*limit:page*limit]:
        u = db.find_one("users", id=c["author_id"]) or {}
        result.append({"id": c["id"], "content": c["content"],
                        "is_mine": c["author_id"] == current_user["id"],
                        "author": {"id": u.get("id"), "name": u.get("name"),
                                   "username": u.get("username"), "avatar_url": u.get("avatar_url")},
                        "created_at": c["created_at"]})
    return {"comments": result, "total": total, "has_more": page*limit < total}

class CommentCreate(BaseModel):
    content: str

@router.post("/posts/{post_id}/comments", status_code=201)
def add_comment(post_id: str, req: CommentCreate, current_user: dict = Depends(get_current_user)):
    if not req.content.strip(): raise HTTPException(400, "Comment cannot be empty.")
    post = db.find_one("posts", id=post_id)
    if not post: raise HTTPException(404)
    c = {"id": uuid.uuid4().hex, "post_id": post_id, "author_id": current_user["id"],
         "content": req.content.strip(), "created_at": _now()}
    db.insert("comments", c)
    if post["author_id"] != current_user["id"] and not post.get("is_anonymous"):
        db.insert("notifications", {"id": uuid.uuid4().hex, "user_id": post["author_id"],
                                    "type": "comment", "title": "New comment",
                                    "message": f"{current_user['name']} commented on your post.",
                                    "actor_id": current_user["id"], "ref_id": post_id,
                                    "is_read": False, "created_at": _now()})
    return {"id": c["id"], "content": c["content"], "is_mine": True,
            "author": {"id": current_user["id"], "name": current_user["name"],
                       "username": current_user["username"], "avatar_url": current_user.get("avatar_url")},
            "created_at": c["created_at"]}

@router.delete("/posts/{post_id}/comments/{comment_id}")
def delete_comment(post_id: str, comment_id: str, current_user: dict = Depends(get_current_user)):
    c = db.find_one("comments", id=comment_id, post_id=post_id)
    if not c: raise HTTPException(404)
    if c["author_id"] != current_user["id"]: raise HTTPException(403)
    db.delete_one("comments", comment_id)
    return {"message": "Deleted."}

@router.get("/stories")
def get_stories(current_user: dict = Depends(get_current_user)):
    cutoff = (datetime.now(timezone.utc) - timedelta(hours=24)).isoformat()
    follows = db.find_many("follows", follower_id=current_user["id"])
    ids = {f["following_id"] for f in follows} | {current_user["id"]}
    stories = [s for s in db.find_all("stories") if s["author_id"] in ids and s["created_at"] >= cutoff]
    grouped = {}
    for s in stories:
        aid = s["author_id"]
        views = db.find_many("story_views", story_id=s["id"])
        is_viewed = any(v["viewer_id"] == current_user["id"] for v in views)
        if aid not in grouped:
            u = db.find_one("users", id=aid) or {}
            grouped[aid] = {"author": {"id": u.get("id"), "name": u.get("name"),
                                       "username": u.get("username"), "avatar_url": u.get("avatar_url")},
                            "stories": [], "has_unviewed": False, "is_mine": aid == current_user["id"]}
        grouped[aid]["stories"].append({**s, "is_viewed": is_viewed})
        if not is_viewed: grouped[aid]["has_unviewed"] = True
    result = list(grouped.values())
    result.sort(key=lambda g: (0 if g["is_mine"] else (1 if g["has_unviewed"] else 2)))
    return result

@router.post("/stories", status_code=201)
async def create_story(caption: str = Form(""), media: UploadFile = File(...),
                       current_user: dict = Depends(get_current_user)):
    ext = os.path.splitext(media.filename)[-1].lower()
    media_type = "video" if ext in {".mp4",".mov"} else "image"
    url = _save_upload(media, "stories")
    story = {"id": uuid.uuid4().hex, "author_id": current_user["id"],
             "media_url": url, "media_type": media_type, "caption": caption.strip() or None,
             "expires_at": (datetime.now(timezone.utc)+timedelta(hours=24)).isoformat(),
             "created_at": _now()}
    db.insert("stories", story)
    return story

@router.post("/stories/{story_id}/view")
def view_story(story_id: str, current_user: dict = Depends(get_current_user)):
    if not db.find_one("stories", id=story_id): raise HTTPException(404)
    if not db.exists("story_views", story_id=story_id, viewer_id=current_user["id"]):
        db.insert("story_views", {"id": uuid.uuid4().hex, "story_id": story_id,
                                   "viewer_id": current_user["id"], "created_at": _now()})
    return {"viewed": True}

@router.get("/journey")
def get_journey(username: Optional[str]=None, page: int=1, limit: int=10,
                current_user: dict=Depends(get_current_user)):
    if username:
        u = db.find_one("users", username=username)
        if not u: raise HTTPException(404)
        target_id = u["id"]
    else:
        target_id = current_user["id"]
    entries = sorted(db.find_many("journey_posts", author_id=target_id),
                     key=lambda e: e.get("week_number",0), reverse=True)
    total = len(entries)
    return {"entries": entries[(page-1)*limit:page*limit], "total": total, "has_more": page*limit < total}

class JourneyCreate(BaseModel):
    week_number: int
    mock_score:  Optional[float] = None
    topics_done: Optional[List[str]] = []
    reflection:  Optional[str] = None
    goals_next:  Optional[str] = None

@router.post("/journey", status_code=201)
def create_journey(req: JourneyCreate, current_user: dict=Depends(get_current_user)):
    if db.exists("journey_posts", author_id=current_user["id"], week_number=req.week_number):
        raise HTTPException(409, f"Week {req.week_number} entry already exists.")
    entry = {"id": uuid.uuid4().hex, "author_id": current_user["id"],
             "week_number": req.week_number, "mock_score": req.mock_score,
             "topics_done": req.topics_done or [], "reflection": req.reflection,
             "goals_next": req.goals_next, "created_at": _now()}
    db.insert("journey_posts", entry)
    return entry

@router.get("/explore")
def explore(q: Optional[str]=None, subject: Optional[str]=None, page: int=1, limit: int=15,
            current_user: dict=Depends(get_current_user)):
    cutoff = (datetime.now(timezone.utc)-timedelta(days=7)).isoformat()
    posts = [p for p in db.find_all("posts") if not p.get("is_anonymous") and p["created_at"] >= cutoff]
    if q:       posts = [p for p in posts if q.lower() in p.get("content","").lower()]
    if subject: posts = [p for p in posts if p.get("subject") == subject]
    posts.sort(key=lambda p: len(db.find_many("post_likes", post_id=p["id"])), reverse=True)
    total = len(posts)
    return {"posts": [_serialize_post(p, current_user) for p in posts[(page-1)*limit:page*limit]],
            "total": total, "has_more": page*limit < total}

@router.get("/tags")
def get_tags(limit: int=20, current_user: dict=Depends(get_current_user)):
    counts = {}
    for p in db.find_all("posts"):
        for t in p.get("tags",[]): counts[t] = counts.get(t,0)+1
    return [{"tag": t, "count": c} for t,c in sorted(counts.items(), key=lambda x: x[1], reverse=True)[:limit]]
