"""
resource_routes.py — Resource Exchange Backend
POST   /api/resources
GET    /api/resources
GET    /api/resources/{resource_id}
PUT    /api/resources/{resource_id}
DELETE /api/resources/{resource_id}
POST   /api/resources/{resource_id}/download
POST   /api/resources/{resource_id}/like
DELETE /api/resources/{resource_id}/like
GET    /api/resources/my/uploads
GET    /api/resources/my/liked
"""

import os
import shutil
import json
from datetime import datetime, timezone
from typing import Optional, List

from fastapi import (
    APIRouter, Depends, HTTPException,
    UploadFile, File, Form
)
from pydantic import BaseModel
from sqlalchemy.orm import Session
from sqlalchemy import desc, or_

from database import get_db
from auth import get_current_user, create_notification
import models

router = APIRouter()
UPLOAD_DIR = os.getenv("UPLOAD_DIR", "uploads")

# Allowed file extensions
ALLOWED_EXTENSIONS = {
    ".pdf", ".doc", ".docx", ".ppt", ".pptx",
    ".xls", ".xlsx", ".txt", ".md",
    ".jpg", ".jpeg", ".png", ".gif",
    ".zip", ".rar",
}


# ══════════════════════════════════════════════════════════
# SCHEMAS
# ══════════════════════════════════════════════════════════

class ResourceUpdate(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    subject: Optional[str] = None
    exam_target: Optional[str] = None
    resource_type: Optional[str] = None
    help_points_cost: Optional[int] = None


# ══════════════════════════════════════════════════════════
# SERIALIZERS
# ══════════════════════════════════════════════════════════

def serialize_resource(
    r: models.Resource,
    current_user: models.User,
) -> dict:
    return {
        "id": r.id,
        "title": r.title,
        "description": r.description,
        "file_url": r.file_url,
        "file_type": r.file_type,
        "subject": r.subject,
        "exam_target": r.exam_target,
        "resource_type": r.resource_type,
        "help_points_cost": r.help_points_cost,
        "downloads": r.downloads,
        "likes_count": len(r.liked_by),
        "is_liked": current_user in r.liked_by,
        "is_mine": r.uploader_id == current_user.id,
        "created_at": r.created_at.isoformat(),
        "uploader": {
            "id": r.uploader.id,
            "name": r.uploader.name,
            "username": r.uploader.username,
            "avatar_url": r.uploader.avatar_url,
            "help_points": r.uploader.help_points,
            "exam_target": r.uploader.exam_target,
        },
        "can_download": (
            r.help_points_cost == 0 or
            current_user.help_points >= r.help_points_cost or
            r.uploader_id == current_user.id
        ),
    }


# ══════════════════════════════════════════════════════════
# UPLOAD
# ══════════════════════════════════════════════════════════

@router.post("", status_code=201)
async def upload_resource(
    title: str = Form(...),
    description: Optional[str] = Form(None),
    subject: Optional[str] = Form(None),
    exam_target: Optional[str] = Form(None),
    resource_type: str = Form("notes"),
    help_points_cost: int = Form(0),
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    if not title.strip():
        raise HTTPException(status_code=400, detail="Title is required.")

    # Validate file extension
    ext = os.path.splitext(file.filename)[-1].lower()
    if ext not in ALLOWED_EXTENSIONS:
        raise HTTPException(
            status_code=400,
            detail=f"File type '{ext}' not allowed. Allowed: {', '.join(ALLOWED_EXTENSIONS)}"
        )

    # Validate help_points_cost
    if help_points_cost < 0:
        raise HTTPException(status_code=400, detail="Help points cost cannot be negative.")
    if help_points_cost > 50:
        raise HTTPException(status_code=400, detail="Max help points cost is 50.")

    # Check file size (max 10MB)
    max_size = int(os.getenv("MAX_UPLOAD_SIZE_MB", 10)) * 1024 * 1024
    content = await file.read()
    if len(content) > max_size:
        raise HTTPException(
            status_code=400,
            detail=f"File too large. Max size is {os.getenv('MAX_UPLOAD_SIZE_MB', 10)}MB."
        )

    # Save file
    fname = f"{current_user.id}_{datetime.now().timestamp()}{ext}"
    path = os.path.join(UPLOAD_DIR, "resources", fname)
    with open(path, "wb") as out:
        out.write(content)

    resource = models.Resource(
        uploader_id=current_user.id,
        title=title.strip(),
        description=description,
        file_url=f"/uploads/resources/{fname}",
        file_type=ext.lstrip("."),
        subject=subject,
        exam_target=exam_target or current_user.exam_target,
        resource_type=resource_type,
        help_points_cost=help_points_cost,
    )
    db.add(resource)

    # Reward uploader with help points for sharing
    current_user.help_points += 3
    current_user.reputation += 5

    db.commit()
    db.refresh(resource)
    return serialize_resource(resource, current_user)


# ══════════════════════════════════════════════════════════
# LIST & SEARCH
# ══════════════════════════════════════════════════════════

@router.get("")
def list_resources(
    q: Optional[str] = None,
    subject: Optional[str] = None,
    exam_target: Optional[str] = None,
    resource_type: Optional[str] = None,
    free_only: bool = False,
    sort: str = "newest",        # newest | popular | downloads
    page: int = 1,
    limit: int = 15,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    query = db.query(models.Resource)

    if q:
        like = f"%{q}%"
        query = query.filter(
            or_(
                models.Resource.title.ilike(like),
                models.Resource.description.ilike(like),
                models.Resource.subject.ilike(like),
            )
        )
    if subject:
        query = query.filter(models.Resource.subject.ilike(f"%{subject}%"))
    if exam_target:
        query = query.filter(models.Resource.exam_target == exam_target)
    if resource_type:
        query = query.filter(models.Resource.resource_type == resource_type)
    if free_only:
        query = query.filter(models.Resource.help_points_cost == 0)

    if sort == "newest":
        query = query.order_by(desc(models.Resource.created_at))
    elif sort == "downloads":
        query = query.order_by(desc(models.Resource.downloads))
    elif sort == "popular":
        query = query.order_by(desc(models.Resource.downloads), desc(models.Resource.created_at))
    else:
        query = query.order_by(desc(models.Resource.created_at))

    total = query.count()
    resources = query.offset((page - 1) * limit).limit(limit).all()

    return {
        "resources": [serialize_resource(r, current_user) for r in resources],
        "total": total,
        "page": page,
        "pages": (total + limit - 1) // limit,
    }


@router.get("/my/uploads")
def my_uploads(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    resources = (
        db.query(models.Resource)
        .filter(models.Resource.uploader_id == current_user.id)
        .order_by(desc(models.Resource.created_at))
        .all()
    )
    return [serialize_resource(r, current_user) for r in resources]


@router.get("/my/liked")
def my_liked(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    return [
        serialize_resource(r, current_user)
        for r in current_user.liked_resources
    ]


# ══════════════════════════════════════════════════════════
# SINGLE RESOURCE
# ══════════════════════════════════════════════════════════

@router.get("/{resource_id}")
def get_resource(
    resource_id: str,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    r = _get_or_404(resource_id, db)
    return serialize_resource(r, current_user)


@router.put("/{resource_id}")
def update_resource(
    resource_id: str,
    req: ResourceUpdate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    r = _get_or_404(resource_id, db)
    if r.uploader_id != current_user.id:
        raise HTTPException(status_code=403, detail="Not your resource.")

    if req.title is not None:
        r.title = req.title.strip()
    if req.description is not None:
        r.description = req.description
    if req.subject is not None:
        r.subject = req.subject
    if req.exam_target is not None:
        r.exam_target = req.exam_target
    if req.resource_type is not None:
        r.resource_type = req.resource_type
    if req.help_points_cost is not None:
        if req.help_points_cost < 0 or req.help_points_cost > 50:
            raise HTTPException(status_code=400, detail="Help points cost must be 0–50.")
        r.help_points_cost = req.help_points_cost

    db.commit()
    db.refresh(r)
    return serialize_resource(r, current_user)


@router.delete("/{resource_id}")
def delete_resource(
    resource_id: str,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    r = _get_or_404(resource_id, db)
    if r.uploader_id != current_user.id and current_user.role != "admin":
        raise HTTPException(status_code=403, detail="Not your resource.")

    # Delete physical file
    file_path = r.file_url.lstrip("/")
    if os.path.exists(file_path):
        os.remove(file_path)

    db.delete(r)
    db.commit()
    return {"message": "Resource deleted."}


# ══════════════════════════════════════════════════════════
# DOWNLOAD  (help-points economy)
# ══════════════════════════════════════════════════════════

@router.post("/{resource_id}/download")
def download_resource(
    resource_id: str,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    """
    Records a download. If resource has a help_points_cost,
    deducts from downloader and credits uploader.
    Returns the file URL for the frontend to fetch.
    """
    r = _get_or_404(resource_id, db)

    # Owner downloads free
    if r.uploader_id != current_user.id and r.help_points_cost > 0:
        if current_user.help_points < r.help_points_cost:
            raise HTTPException(
                status_code=402,
                detail=(
                    f"Insufficient help points. "
                    f"You need {r.help_points_cost} points but have {current_user.help_points}. "
                    f"Earn points by answering questions or uploading resources."
                ),
            )
        # Transfer help points
        current_user.help_points -= r.help_points_cost
        r.uploader.help_points += r.help_points_cost

        create_notification(
            db, r.uploader_id, "resource_download",
            f"{current_user.name} downloaded \"{r.title}\" (+{r.help_points_cost} help points)",
            link=f"/resources/{resource_id}",
        )

    r.downloads += 1
    db.commit()

    return {
        "file_url": r.file_url,
        "file_type": r.file_type,
        "title": r.title,
        "downloads": r.downloads,
    }


# ══════════════════════════════════════════════════════════
# LIKES
# ══════════════════════════════════════════════════════════

@router.post("/{resource_id}/like", status_code=201)
def like_resource(
    resource_id: str,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    r = _get_or_404(resource_id, db)
    if current_user in r.liked_by:
        raise HTTPException(status_code=400, detail="Already liked.")
    r.liked_by.append(current_user)

    if r.uploader_id != current_user.id:
        create_notification(
            db, r.uploader_id, "resource_like",
            f"{current_user.name} liked your resource \"{r.title}\".",
            link=f"/resources/{resource_id}",
        )

    db.commit()
    return {"likes_count": len(r.liked_by)}


@router.delete("/{resource_id}/like")
def unlike_resource(
    resource_id: str,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    r = _get_or_404(resource_id, db)
    if current_user not in r.liked_by:
        raise HTTPException(status_code=400, detail="Not liked yet.")
    r.liked_by.remove(current_user)
    db.commit()
    return {"likes_count": len(r.liked_by)}


# ══════════════════════════════════════════════════════════
# STATS
# ══════════════════════════════════════════════════════════

@router.get("/stats/overview")
def resource_stats(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    """Overview stats shown on the Resources page header."""
    total_resources = db.query(models.Resource).count()
    total_downloads = db.query(models.Resource).all()
    total_dl_count = sum(r.downloads for r in total_downloads)
    free_resources = db.query(models.Resource).filter(
        models.Resource.help_points_cost == 0
    ).count()

    return {
        "total_resources": total_resources,
        "total_downloads": total_dl_count,
        "free_resources": free_resources,
        "your_uploads": db.query(models.Resource).filter(
            models.Resource.uploader_id == current_user.id
        ).count(),
        "your_help_points": current_user.help_points,
    }


# ══════════════════════════════════════════════════════════
# INTERNAL HELPERS
# ══════════════════════════════════════════════════════════

def _get_or_404(resource_id: str, db: Session) -> models.Resource:
    r = db.query(models.Resource).filter(models.Resource.id == resource_id).first()
    if not r:
        raise HTTPException(status_code=404, detail="Resource not found.")
    return r
