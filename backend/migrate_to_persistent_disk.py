#!/usr/bin/env python3
"""
migrate_to_persistent_disk.py
─────────────────────────────
Run this ONCE on your Render shell after adding the persistent disk.
It copies your existing data/ and uploads/ from the ephemeral container
into /var/data/ (the persistent disk mount) so nothing is lost.

Usage (in Render shell):
    cd /opt/render/project/src/backend
    python migrate_to_persistent_disk.py
"""

import os
import shutil

SRC_DATA    = os.path.join(os.path.dirname(__file__), "data")
SRC_UPLOADS = os.path.join(os.path.dirname(__file__), "uploads")

DST_DATA    = "/var/data/db"
DST_UPLOADS = "/var/data/uploads"


def copy_dir(src, dst, label):
    if not os.path.isdir(src):
        print(f"  [skip] {label}: source '{src}' does not exist")
        return
    if os.path.isdir(dst) and os.listdir(dst):
        print(f"  [skip] {label}: destination '{dst}' already has files — not overwriting")
        return
    os.makedirs(dst, exist_ok=True)
    shutil.copytree(src, dst, dirs_exist_ok=True)
    files = sum(len(fs) for _, _, fs in os.walk(dst))
    print(f"  [ok]   {label}: copied {files} file(s) → {dst}")


print("EduConnect — persistent disk migration")
print("=" * 45)
copy_dir(SRC_DATA,    DST_DATA,    "JSON data files")
copy_dir(SRC_UPLOADS, DST_UPLOADS, "Uploaded media files")
print("=" * 45)
print("Done. Restart your Render service to pick up the new paths.")
