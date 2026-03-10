"""
database.py — Simple JSON flat-file store (replaces SQLAlchemy)
Each entity lives in  data/<entity>.json  as a list of dicts.
Thread-safe via a per-file lock.
"""

import os
import json
import threading
from typing import Any, Dict, List, Optional

DATA_DIR = os.getenv("DATA_DIR", "data")
os.makedirs(DATA_DIR, exist_ok=True)

_locks: Dict[str, threading.Lock] = {}

def _lock_for(name: str) -> threading.Lock:
    if name not in _locks:
        _locks[name] = threading.Lock()
    return _locks[name]

def _path(entity: str) -> str:
    return os.path.join(DATA_DIR, f"{entity}.json")

# ── Core read / write ──────────────────────────────────────

def load(entity: str) -> List[Dict]:
    p = _path(entity)
    if not os.path.exists(p):
        return []
    with _lock_for(entity):
        with open(p, "r", encoding="utf-8") as f:
            try:
                return json.load(f)
            except json.JSONDecodeError:
                return []

def save(entity: str, records: List[Dict]) -> None:
    p = _path(entity)
    with _lock_for(entity):
        with open(p, "w", encoding="utf-8") as f:
            json.dump(records, f, indent=2, default=str)

# ── CRUD helpers ───────────────────────────────────────────

def find_all(entity: str) -> List[Dict]:
    return load(entity)

def find_one(entity: str, **kwargs) -> Optional[Dict]:
    for r in load(entity):
        if all(r.get(k) == v for k, v in kwargs.items()):
            return r
    return None

def find_many(entity: str, **kwargs) -> List[Dict]:
    return [r for r in load(entity) if all(r.get(k) == v for k, v in kwargs.items())]

def insert(entity: str, record: Dict) -> Dict:
    records = load(entity)
    records.append(record)
    save(entity, records)
    return record

def update_one(entity: str, record_id: str, updates: Dict) -> Optional[Dict]:
    records = load(entity)
    for i, r in enumerate(records):
        if r.get("id") == record_id:
            records[i] = {**r, **updates}
            save(entity, records)
            return records[i]
    return None

def delete_one(entity: str, record_id: str) -> bool:
    records = load(entity)
    new = [r for r in records if r.get("id") != record_id]
    if len(new) == len(records):
        return False
    save(entity, new)
    return True

def delete_many(entity: str, **kwargs) -> int:
    records = load(entity)
    new = [r for r in records if not all(r.get(k) == v for k, v in kwargs.items())]
    removed = len(records) - len(new)
    if removed:
        save(entity, new)
    return removed

def count(entity: str, **kwargs) -> int:
    return len(find_many(entity, **kwargs)) if kwargs else len(load(entity))

def exists(entity: str, **kwargs) -> bool:
    return find_one(entity, **kwargs) is not None

def upsert(entity: str, match: Dict, data: Dict) -> Dict:
    """Update if match found, otherwise insert."""
    records = load(entity)
    for i, r in enumerate(records):
        if all(r.get(k) == v for k, v in match.items()):
            records[i] = {**r, **data}
            save(entity, records)
            return records[i]
    save(entity, records + [data])
    return data
