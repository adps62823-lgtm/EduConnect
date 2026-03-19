"""
auth.py — Authentication utilities for EduConnect
- Password hashing with bcrypt
- JWT token creation & verification
- get_current_user FastAPI dependency
- Optional school email domain restriction
"""

import os
from datetime import datetime, timedelta, timezone
from typing import Optional

from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from jose import JWTError, jwt
from passlib.context import CryptContext
from sqlalchemy.orm import Session
from dotenv import load_dotenv

from database import get_db
import models

load_dotenv()

# ── Config ────────────────────────────────────────────────
SECRET_KEY = os.getenv("SECRET_KEY", "change_me_in_production_please")
ALGORITHM  = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = int(os.getenv("ACCESS_TOKEN_EXPIRE_MINUTES", 10080))

RESTRICT_TO_SCHOOL   = os.getenv("RESTRICT_TO_SCHOOL", "false").lower() == "true"
ALLOWED_EMAIL_DOMAIN = os.getenv("ALLOWED_EMAIL_DOMAIN", "")

# ── Password Hashing ──────────────────────────────────────
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

def hash_password(plain: str) -> str:
    return pwd_context.hash(plain)

def verify_password(plain: str, hashed: str) -> bool:
    return pwd_context.verify(plain, hashed)

# ── OAuth2 scheme (reads Bearer token from Authorization header) ──
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/auth/login")

# ── Token Creation ────────────────────────────────────────
def create_access_token(data: dict, expires_delta: Optional[timedelta] = None) -> str:
    to_encode = data.copy()
    expire = datetime.now(timezone.utc) + (
        expires_delta or timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    )
    to_encode.update({"exp": expire})
    return jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)

# ── Token Verification ────────────────────────────────────
def decode_token(token: str) -> dict:
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        return payload
    except JWTError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Could not validate credentials.",
            headers={"WWW-Authenticate": "Bearer"},
        )

# ── get_current_user dependency ───────────────────────────
def get_current_user(
    token: str = Depends(oauth2_scheme),
    db: Session = Depends(get_db),
) -> models.User:
    """
    Decode JWT, look up user in DB.
    Raises 401 if token is invalid or user not found/inactive.
    """
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials.",
        headers={"WWW-Authenticate": "Bearer"},
    )

    payload = decode_token(token)
    user_id: str = payload.get("sub")
    if user_id is None:
        raise credentials_exception

    user = db.query(models.User).filter(models.User.id == user_id).first()
    if user is None or not user.is_active:
        raise credentials_exception

    return user


def get_current_active_user(
    current_user: models.User = Depends(get_current_user),
) -> models.User:
    """Alias — same as get_current_user but named more explicitly."""
    return current_user


def get_admin_user(
    current_user: models.User = Depends(get_current_user),
) -> models.User:
    """Only allows users with role='admin'."""
    if current_user.role != "admin":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Admin access required.",
        )
    return current_user


def get_mentor_or_admin(
    current_user: models.User = Depends(get_current_user),
) -> models.User:
    """Allows mentors and admins."""
    if current_user.role not in ("mentor", "admin"):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Mentor or admin access required.",
        )
    return current_user


# ── Optional auth (routes accessible to guests too) ───────
def get_optional_user(
    token: Optional[str] = Depends(OAuth2PasswordBearer(tokenUrl="/api/auth/login", auto_error=False)),
    db: Session = Depends(get_db),
) -> Optional[models.User]:
    """
    Returns the current user if a valid token is provided,
    or None if the request is unauthenticated.
    Used for public routes that show extra info to logged-in users.
    """
    if token is None:
        return None
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        user_id = payload.get("sub")
        if user_id is None:
            return None
        user = db.query(models.User).filter(models.User.id == user_id).first()
        return user if (user and user.is_active) else None
    except JWTError:
        return None


# ── School Email Validator ────────────────────────────────
def validate_school_email(email: str) -> None:
    """
    If RESTRICT_TO_SCHOOL=true, only allow registrations
    from emails matching ALLOWED_EMAIL_DOMAIN.
    """
    if not RESTRICT_TO_SCHOOL:
        return
    domain = email.split("@")[-1].lower()
    if domain != ALLOWED_EMAIL_DOMAIN.lower():
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=(
                f"Registration is restricted to {ALLOWED_EMAIL_DOMAIN} email addresses only. "
                f"This is a pilot for EduConnect school users."
            ),
        )


# ── Notification Helper ───────────────────────────────────
def create_notification(
    db: Session,
    user_id: str,
    notif_type: str,
    content: str,
    link: str = None,
) -> None:
    """
    Convenience function used throughout routes to create a notification.
    """
    notif = models.Notification(
        user_id=user_id,
        type=notif_type,
        content=content,
        link=link,
    )
    db.add(notif)
    # Don't commit here — caller commits as part of its own transaction
