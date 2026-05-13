"""
push_routes.py — Web Push notification routes for EduConnect
Handles subscription storage and push delivery via pywebpush.

Install: pip install pywebpush
"""

import os
import json
import logging
import uuid
from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from typing import Optional

import database as db
from auth import get_current_user

try:
    from pywebpush import webpush, WebPushException
    PUSH_AVAILABLE = True
except ImportError:
    PUSH_AVAILABLE = False
    logging.warning("pywebpush not installed. Run: pip install pywebpush")

router  = APIRouter()
logger  = logging.getLogger("educonnect.push")

VAPID_PRIVATE_KEY = os.getenv("VAPID_PRIVATE_KEY", "")
VAPID_PUBLIC_KEY  = os.getenv("VAPID_PUBLIC_KEY",  "")
VAPID_CLAIMS      = {
    "sub": f"mailto:{os.getenv('VAPID_EMAIL', 'admin@educonnect.app')}"
}

def _now():
    return datetime.now(timezone.utc).isoformat()


# ── Models ────────────────────────────────────────────────

class PushSubscription(BaseModel):
    endpoint:   str
    keys:       dict          # { p256dh: str, auth: str }
    expirationTime: Optional[int] = None


# ── Routes ───────────────────────────────────────────────

@router.post("/subscribe")
def subscribe(sub: PushSubscription, current_user: dict = Depends(get_current_user)):
    """Save a push subscription for the current user."""
    if not sub.endpoint:
        raise HTTPException(400, "Invalid subscription.")

    # Upsert — one subscription per endpoint
    existing = db.find_one("push_subscriptions", endpoint=sub.endpoint)
    record = {
        "id":          existing["id"] if existing else uuid.uuid4().hex,
        "user_id":     current_user["id"],
        "endpoint":    sub.endpoint,
        "keys":        sub.keys,
        "created_at":  existing.get("created_at", _now()) if existing else _now(),
        "updated_at":  _now(),
    }

    if existing:
        db.update_one("push_subscriptions", existing["id"], record)
    else:
        db.insert("push_subscriptions", record)

    logger.info("Push subscription saved for user %s", current_user["id"])
    return {"subscribed": True}


@router.post("/unsubscribe")
def unsubscribe(sub: dict, current_user: dict = Depends(get_current_user)):
    """Remove a push subscription."""
    endpoint = sub.get("endpoint", "")
    if endpoint:
        existing = db.find_one("push_subscriptions", endpoint=endpoint)
        if existing and existing["user_id"] == current_user["id"]:
            db.delete_one("push_subscriptions", existing["id"])
    return {"unsubscribed": True}


# ── Core push sender — import and call from other routes ──

def send_push_to_user(user_id: str, title: str, body: str,
                      url: str = "/", tag: str = "educonnect",
                      icon: str = "/icon-192.png"):
    """
    Send a Web Push notification to all subscriptions for a user.
    Call this from any route after inserting a notification record.

    Example:
        from routes.push_routes import send_push_to_user
        send_push_to_user(target_user_id, "New message", "You have a new message", url="/chat")
    """
    if not PUSH_AVAILABLE:
        logger.warning("pywebpush not available — push skipped.")
        return

    if not VAPID_PRIVATE_KEY or not VAPID_PUBLIC_KEY:
        logger.warning("VAPID keys not configured — push skipped.")
        return

    subscriptions = db.find_many("push_subscriptions", user_id=user_id)
    if not subscriptions:
        return

    payload = json.dumps({
        "title": title,
        "body":  body,
        "icon":  icon,
        "badge": icon,
        "tag":   tag,
        "url":   url,
    })

    dead_endpoints = []

    for sub in subscriptions:
        try:
            webpush(
                subscription_info={
                    "endpoint": sub["endpoint"],
                    "keys":     sub["keys"],
                },
                data=payload,
                vapid_private_key=VAPID_PRIVATE_KEY,
                vapid_claims=VAPID_CLAIMS,
            )
            logger.debug("Push sent to user %s", user_id)
        except WebPushException as exc:
            status = getattr(exc.response, "status_code", None)
            if status in (404, 410):
                # Subscription expired — clean up
                dead_endpoints.append(sub["id"])
                logger.info("Removed expired push subscription %s", sub["id"])
            else:
                logger.warning("Push failed for user %s: %s", user_id, exc)
        except Exception as exc:
            logger.warning("Push error for user %s: %s", user_id, exc)

    for record_id in dead_endpoints:
        try:
            db.delete_one("push_subscriptions", record_id)
        except Exception:
            pass
