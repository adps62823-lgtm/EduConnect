"""
database.py — MongoDB backend for EduConnect
Drop-in replacement for the flat-file JSON store.
Exposes the exact same API: find_one, find_many, insert,
update_one, delete_one, delete_many, count, exists, upsert, find_all.

Every document is stored with a string `id` field (uuid hex).
MongoDB's own `_id` is kept internal and never leaked to callers.
"""

import os
import logging
from typing import Any, Dict, List, Optional

from pymongo import MongoClient
from pymongo.collection import Collection
from dotenv import load_dotenv

load_dotenv()

logger = logging.getLogger("educonnect.db")

MONGO_URI = os.getenv("MONGO_URI", "")
DB_NAME   = os.getenv("MONGO_DB_NAME", "educonnect")

if not MONGO_URI:
    raise RuntimeError(
        "MONGO_URI is not set. Add it to your .env file.\n"
        "Example: MONGO_URI=mongodb+srv://user:pass@cluster.mongodb.net/"
    )

_client: MongoClient = MongoClient(MONGO_URI, serverSelectionTimeoutMS=10_000)
_db = _client[DB_NAME]

logger.info("MongoDB connected → database: %s", DB_NAME)


# ── Internal helpers ──────────────────────────────────────

def _col(entity: str) -> Collection:
    """Return a collection, creating it lazily (MongoDB does this automatically)."""
    return _db[entity]


def _clean(doc: Optional[Dict]) -> Optional[Dict]:
    """Strip MongoDB's internal _id from a document before returning to callers."""
    if doc is None:
        return None
    doc = dict(doc)
    doc.pop("_id", None)
    return doc


def _match(kwargs: Dict) -> Dict:
    """
    Convert caller kwargs to a MongoDB query dict.
    Callers always match on simple equality, e.g. find_one('users', id='abc').
    """
    return kwargs  # MongoDB accepts plain equality dicts directly


# ── Public API (identical surface to the old flat-file version) ──


def find_all(entity: str) -> List[Dict]:
    return [_clean(d) for d in _col(entity).find({})]


def find_one(entity: str, **kwargs) -> Optional[Dict]:
    return _clean(_col(entity).find_one(_match(kwargs)))


def find_many(entity: str, **kwargs) -> List[Dict]:
    query = _match(kwargs) if kwargs else {}
    return [_clean(d) for d in _col(entity).find(query)]


def insert(entity: str, record: Dict) -> Dict:
    doc = dict(record)
    _col(entity).insert_one(doc)
    return _clean(doc)  # type: ignore[return-value]


def update_one(entity: str, record_id: str, updates: Dict) -> Optional[Dict]:
    result = _col(entity).find_one_and_update(
        {"id": record_id},
        {"$set": updates},
        return_document=True,  # return the updated document
    )
    return _clean(result)


def delete_one(entity: str, record_id: str) -> bool:
    result = _col(entity).delete_one({"id": record_id})
    return result.deleted_count > 0


def delete_many(entity: str, **kwargs) -> int:
    result = _col(entity).delete_many(_match(kwargs))
    return result.deleted_count


def count(entity: str, **kwargs) -> int:
    query = _match(kwargs) if kwargs else {}
    return _col(entity).count_documents(query)


def exists(entity: str, **kwargs) -> bool:
    return _col(entity).find_one(_match(kwargs), {"_id": 1}) is not None


def upsert(entity: str, match: Dict, data: Dict) -> Dict:
    """Update if match found, otherwise insert. Returns the final document."""
    result = _col(entity).find_one_and_update(
        _match(match),
        {"$set": data},
        upsert=True,
        return_document=True,
    )
    return _clean(result)  # type: ignore[return-value]


# ── Kept for compatibility (not used internally anymore) ──

def load(entity: str) -> List[Dict]:
    """Legacy alias for find_all."""
    return find_all(entity)


def save(entity: str, records: List[Dict]) -> None:
    """
    Legacy bulk-replace used by old flat-file code.
    Replaces the entire collection — use sparingly.
    """
    col = _col(entity)
    col.delete_many({})
    if records:
        col.insert_many([dict(r) for r in records])


# ── Indexes (call once at startup for performance) ────────

def ensure_indexes() -> None:
    """Create useful indexes. Safe to call multiple times."""
    indexes = {
        "users":         [("username", 1), ("email", 1)],
        "posts":         [("author_id", 1), ("created_at", -1)],
        "messages":      [("chat_id", 1), ("created_at", 1)],
        "conversations": [("participant_ids", 1)],
        "follows":       [("follower_id", 1), ("following_id", 1)],
        "notifications": [("user_id", 1), ("created_at", -1)],
        "questions":     [("author_id", 1), ("created_at", -1)],
        "comments":      [("post_id", 1)],
        "post_likes":    [("post_id", 1), ("user_id", 1)],
        "stories":       [("author_id", 1), ("created_at", -1)],
        "rooms":         [("created_by", 1)],
        "room_members":  [("room_id", 1), ("user_id", 1)],
    }
    for collection, fields in indexes.items():
        col = _col(collection)
        for field, direction in fields:
            try:
                col.create_index([(field, direction)])
            except Exception as exc:
                logger.warning("Index creation skipped for %s.%s: %s", collection, field, exc)

    logger.info("MongoDB indexes ensured.")
