"""
cloudinary_utils.py — Centralised Cloudinary upload helper for EduConnect.

Every route that previously called  _save_upload(file, subfolder)
now calls  upload_file(file, folder=subfolder)  from here.

Returns a permanent HTTPS URL from Cloudinary instead of a local path.
"""

import os
import logging
from typing import Optional

import cloudinary
import cloudinary.uploader
from fastapi import UploadFile
from dotenv import load_dotenv

load_dotenv()

logger = logging.getLogger("educonnect.cloudinary")

# ── Configure Cloudinary from env vars ───────────────────

cloudinary.config(
    cloud_name = os.getenv("CLOUDINARY_CLOUD_NAME", ""),
    api_key    = os.getenv("CLOUDINARY_API_KEY",    ""),
    api_secret = os.getenv("CLOUDINARY_API_SECRET", ""),
    secure     = True,
)

_configured = all([
    os.getenv("CLOUDINARY_CLOUD_NAME"),
    os.getenv("CLOUDINARY_API_KEY"),
    os.getenv("CLOUDINARY_API_SECRET"),
])

if not _configured:
    logger.warning(
        "Cloudinary credentials not fully set. "
        "File uploads will fail. Set CLOUDINARY_CLOUD_NAME, "
        "CLOUDINARY_API_KEY, CLOUDINARY_API_SECRET in your .env"
    )


# ── Resource type detection ───────────────────────────────

_VIDEO_EXTS  = {".mp4", ".mov", ".avi", ".mkv", ".webm", ".ogg"}
_IMAGE_EXTS  = {".jpg", ".jpeg", ".png", ".gif", ".webp", ".svg", ".bmp"}
_RAW_EXTS    = {".pdf", ".doc", ".docx", ".ppt", ".pptx", ".xls", ".xlsx",
                ".txt", ".py", ".zip"}


def _resource_type(filename: str) -> str:
    ext = os.path.splitext(filename.lower())[-1]
    if ext in _VIDEO_EXTS:
        return "video"
    if ext in _IMAGE_EXTS:
        return "image"
    return "raw"


# ── Main upload function ──────────────────────────────────

async def upload_file(
    file: UploadFile,
    folder: str = "misc",
    public_id: Optional[str] = None,
) -> str:
    """
    Upload a FastAPI UploadFile to Cloudinary.

    Args:
        file:      The FastAPI UploadFile object.
        folder:    Cloudinary folder name (e.g. 'avatars', 'posts', 'chat').
        public_id: Optional explicit public_id. Auto-generated if omitted.

    Returns:
        A permanent HTTPS URL string.

    Raises:
        RuntimeError if Cloudinary is not configured or upload fails.
    """
    if not _configured:
        raise RuntimeError(
            "Cloudinary is not configured. "
            "Set CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, CLOUDINARY_API_SECRET."
        )

    filename   = file.filename or "upload"
    res_type   = _resource_type(filename)
    folder_path = f"educonnect/{folder}"

    contents = await file.read()

    try:
        result = cloudinary.uploader.upload(
            contents,
            folder        = folder_path,
            public_id     = public_id,
            resource_type = res_type,
            overwrite     = True,
            # Auto-optimize images
            quality       = "auto" if res_type == "image" else None,
            fetch_format  = "auto" if res_type == "image" else None,
        )
    except Exception as exc:
        logger.error("Cloudinary upload failed: %s", exc)
        raise RuntimeError(f"File upload failed: {exc}") from exc

    url: str = result.get("secure_url", "")
    logger.info("Uploaded %s → %s", filename, url)
    return url


async def upload_file_sync(file, folder: str = "misc") -> str:
    """
    Sync-friendly wrapper for non-async call sites.
    Reads the file object directly (not an UploadFile).
    """
    if not _configured:
        raise RuntimeError("Cloudinary is not configured.")

    try:
        result = cloudinary.uploader.upload(
            file,
            folder        = f"educonnect/{folder}",
            resource_type = "auto",
            quality       = "auto",
            fetch_format  = "auto",
        )
    except Exception as exc:
        logger.error("Cloudinary upload failed: %s", exc)
        raise RuntimeError(f"File upload failed: {exc}") from exc

    return result.get("secure_url", "")


def delete_file(public_id: str, resource_type: str = "image") -> bool:
    """Delete a file from Cloudinary by its public_id."""
    try:
        result = cloudinary.uploader.destroy(public_id, resource_type=resource_type)
        return result.get("result") == "ok"
    except Exception as exc:
        logger.error("Cloudinary delete failed: %s", exc)
        return False
