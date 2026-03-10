"""resource_routes.py — Resource exchange (JSON store)"""
import uuid, os, shutil
from datetime import datetime, timezone
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, Query, UploadFile, File, Form
import database as db
from auth import get_current_user

router = APIRouter()
UPLOAD_DIR = os.getenv("UPLOAD_DIR", "uploads")
def _now(): return datetime.now(timezone.utc).isoformat()

def _serialize(r, cu):
    uploader = db.find_one("users", id=r["uploader_id"]) or {}
    likes = db.find_many("resource_likes", resource_id=r["id"])
    return {**r,
            "uploader": {"id": uploader.get("id"), "name": uploader.get("name"),
                         "username": uploader.get("username"), "avatar_url": uploader.get("avatar_url")},
            "likes_count": len(likes),
            "is_liked": any(l["user_id"] == cu["id"] for l in likes),
            "is_mine": r["uploader_id"] == cu["id"]}

@router.get("")
def list_resources(page: int=1, limit: int=12, q: Optional[str]=None,
                   subject: Optional[str]=None, resource_type: Optional[str]=None,
                   sort: str=Query("newest", enum=["newest","popular"]),
                   current_user: dict=Depends(get_current_user)):
    resources = db.find_all("resources")
    if q:             resources = [r for r in resources if q.lower() in r.get("title","").lower()]
    if subject:       resources = [r for r in resources if r.get("subject") == subject]
    if resource_type: resources = [r for r in resources if r.get("resource_type") == resource_type]
    if sort == "popular":
        resources.sort(key=lambda r: len(db.find_many("resource_likes", resource_id=r["id"])), reverse=True)
    else:
        resources.sort(key=lambda r: r["created_at"], reverse=True)
    total = len(resources)
    return {"resources": [_serialize(r, current_user) for r in resources[(page-1)*limit:page*limit]],
            "total": total, "has_more": page*limit < total}

@router.post("", status_code=201)
async def upload_resource(
    title: str=Form(...), description: str=Form(""),
    subject: str=Form(""), resource_type: str=Form("notes"),
    exam_target: str=Form(""), points_cost: int=Form(0),
    file: UploadFile=File(...),
    current_user: dict=Depends(get_current_user),
):
    if not title.strip(): raise HTTPException(400, "Title required.")
    content = await file.read()
    if len(content) > 10*1024*1024: raise HTTPException(400, "File too large (max 10MB).")
    ext = os.path.splitext(file.filename)[-1].lower()
    fname = f"{uuid.uuid4().hex}{ext}"
    folder = os.path.join(UPLOAD_DIR, "resources")
    os.makedirs(folder, exist_ok=True)
    with open(os.path.join(folder, fname), "wb") as out:
        out.write(content)
    resource = {"id": uuid.uuid4().hex, "uploader_id": current_user["id"],
                "title": title.strip(), "description": description.strip(),
                "subject": subject or None, "resource_type": resource_type,
                "exam_target": exam_target or None, "points_cost": max(0, points_cost),
                "file_url": f"/uploads/resources/{fname}",
                "file_name": file.filename, "file_size": len(content),
                "downloads": 0, "created_at": _now()}
    db.insert("resources", resource)
    db.update_one("users", current_user["id"],
                  {"help_points": current_user.get("help_points",0)+3})
    return _serialize(resource, current_user)

@router.get("/{resource_id}")
def get_resource(resource_id: str, current_user: dict=Depends(get_current_user)):
    r = db.find_one("resources", id=resource_id)
    if not r: raise HTTPException(404)
    return _serialize(r, current_user)

@router.delete("/{resource_id}")
def delete_resource(resource_id: str, current_user: dict=Depends(get_current_user)):
    r = db.find_one("resources", id=resource_id)
    if not r: raise HTTPException(404)
    if r["uploader_id"] != current_user["id"]: raise HTTPException(403)
    db.delete_one("resources", resource_id)
    return {"message": "Deleted."}

@router.post("/{resource_id}/like")
def toggle_like(resource_id: str, current_user: dict=Depends(get_current_user)):
    if not db.find_one("resources", id=resource_id): raise HTTPException(404)
    existing = db.find_one("resource_likes", resource_id=resource_id, user_id=current_user["id"])
    count = len(db.find_many("resource_likes", resource_id=resource_id))
    if existing:
        db.delete_one("resource_likes", existing["id"])
        return {"liked": False, "likes_count": count-1}
    db.insert("resource_likes", {"id": uuid.uuid4().hex, "resource_id": resource_id,
                                   "user_id": current_user["id"], "created_at": _now()})
    return {"liked": True, "likes_count": count+1}

@router.post("/{resource_id}/download")
def download_resource(resource_id: str, current_user: dict=Depends(get_current_user)):
    r = db.find_one("resources", id=resource_id)
    if not r: raise HTTPException(404)
    cost = r.get("points_cost", 0)
    if cost > 0 and r["uploader_id"] != current_user["id"]:
        if current_user.get("help_points",0) < cost:
            raise HTTPException(402, f"Need {cost} help points to download.")
        db.update_one("users", current_user["id"], {"help_points": current_user.get("help_points",0)-cost})
        uploader = db.find_one("users", id=r["uploader_id"])
        if uploader:
            db.update_one("users", uploader["id"], {"help_points": uploader.get("help_points",0)+cost})
    db.update_one("resources", resource_id, {"downloads": r.get("downloads",0)+1})
    return {"file_url": r["file_url"]}
