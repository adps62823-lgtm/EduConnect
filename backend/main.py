import logging
import os
import uuid
from contextlib import asynccontextmanager
from datetime import datetime, timezone

from dotenv import load_dotenv
from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from fastapi.staticfiles import StaticFiles

import database
from routes.auth_routes import router as auth_router
from routes.chat_routes import router as chat_router
from routes.college_routes import router as college_router
from routes.feed_routes import router as feed_router
from routes.gamification_routes import router as gamification_router
from routes.help_routes import router as help_router
from routes.mentor_routes import router as mentor_router
from routes.profile_routes import router as profile_router
from routes.resource_routes import router as resource_router
from routes.room_routes import router as room_router

load_dotenv()

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("educonnect")

# ── Resolve storage paths from env vars ───────────────────
# On Render these point to the persistent disk (/var/data/...).
# Locally they default to relative paths inside the backend folder.
DATA_DIR   = os.getenv("DATA_DIR",   "data")
UPLOAD_DIR = os.getenv("UPLOAD_DIR", "uploads")


def _now() -> str:
    return datetime.now(timezone.utc).isoformat()


def _user_payload(user: dict | None) -> dict | None:
    if not user:
        return None
    return {
        "id":         user["id"],
        "name":       user["name"],
        "username":   user["username"],
        "avatar_url": user.get("avatar_url"),
    }


def _room_member_ids(room_id: str) -> list[str]:
    return [
        row["user_id"]
        for row in database.find_many("room_members", room_id=room_id)
        if row.get("user_id")
    ]


def _is_room_member(room_id: str, user_id: str) -> bool:
    return user_id in _room_member_ids(room_id)


def _pick_fields(source: dict, allowed_fields: set[str]) -> dict:
    return {k: source[k] for k in allowed_fields if k in source}


class ConnectionManager:
    def __init__(self):
        self.active: dict[str, list[WebSocket]] = {}

    async def connect(self, websocket: WebSocket, user_id: str):
        await websocket.accept()
        self.active.setdefault(user_id, []).append(websocket)
        logger.info("WS connected: user=%s", user_id)

    def disconnect(self, websocket: WebSocket, user_id: str):
        conns = self.active.get(user_id, [])
        if websocket in conns:
            conns.remove(websocket)
        if not conns:
            self.active.pop(user_id, None)

    async def send_to_user(self, user_id: str, message: dict):
        for ws in list(self.active.get(user_id, [])):
            try:
                await ws.send_json(message)
            except Exception:
                pass

    async def send_to_users(self, user_ids: list[str], message: dict, exclude: str = None):
        for uid in user_ids:
            if uid != exclude:
                await self.send_to_user(uid, message)

    async def broadcast(self, message: dict, exclude: str = None):
        for uid in list(self.active):
            if uid != exclude:
                await self.send_to_user(uid, message)


manager = ConnectionManager()


async def _send_room_event(room_id: str, message: dict, exclude: str = None):
    member_ids = _room_member_ids(room_id)
    if member_ids:
        await manager.send_to_users(member_ids, message, exclude=exclude)


@asynccontextmanager
async def lifespan(app: FastAPI):
    # ── Ensure all storage directories exist on startup ─────
    # On Render with a persistent disk, DATA_DIR = /var/data/db
    # and UPLOAD_DIR = /var/data/uploads — both survive restarts.
    os.makedirs(DATA_DIR, exist_ok=True)
    for subdir in ["avatars", "covers", "posts", "stories", "resources", "wallpapers", "chat"]:
        os.makedirs(os.path.join(UPLOAD_DIR, subdir), exist_ok=True)

    logger.info("EduConnect backend started")
    logger.info("  DATA_DIR   = %s", DATA_DIR)
    logger.info("  UPLOAD_DIR = %s", UPLOAD_DIR)
    yield
    logger.info("EduConnect backend shutting down")


app = FastAPI(
    title="EduConnect API",
    description="Educational Social Media Platform API",
    version=os.getenv("APP_VERSION", "1.0.0"),
    lifespan=lifespan,
)

app.state.manager = manager

# ── CORS ────────────────────────────────────────────────────
frontend_url = os.getenv("FRONTEND_URL", "http://localhost:5173")
origins = [
    frontend_url,
    "http://localhost:5173",
    "http://localhost:3000",
    "http://127.0.0.1:5173",
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ── Static file serving for uploads ─────────────────────────
# UPLOAD_DIR is guaranteed to exist after lifespan startup above.
app.mount("/uploads", StaticFiles(directory=UPLOAD_DIR), name="uploads")

# ── Routers ─────────────────────────────────────────────────
app.include_router(auth_router,          prefix="/api/auth",        tags=["Auth"])
app.include_router(feed_router,          prefix="/api/feed",        tags=["Feed"])
app.include_router(help_router,          prefix="/api/help",        tags=["Help Forum"])
app.include_router(chat_router,          prefix="/api/chat",        tags=["Chat"])
app.include_router(mentor_router,        prefix="/api/mentor",      tags=["Mentor"])
app.include_router(room_router,          prefix="/api/rooms",       tags=["Study Rooms"])
app.include_router(resource_router,      prefix="/api/resources",   tags=["Resources"])
app.include_router(profile_router,       prefix="/api/profile",     tags=["Profile"])
app.include_router(college_router,       prefix="/api/colleges",    tags=["Colleges"])
app.include_router(gamification_router,  prefix="/api/gamification",tags=["Gamification"])


# ── WebSocket ────────────────────────────────────────────────
@app.websocket("/ws/{user_id}")
async def websocket_endpoint(websocket: WebSocket, user_id: str):
    await manager.connect(websocket, user_id)
    try:
        while True:
            data = await websocket.receive_json()
            event_type = data.get("type", "")

            if event_type in (
                "webrtc_offer",
                "webrtc_answer",
                "webrtc_ice",
                "offer",
                "answer",
                "ice_candidate",
                "room_state_sync",
                "room_state_sync_request",
            ):
                target  = data.get("to")
                room_id = data.get("room_id")
                if target and room_id and database.find_one("rooms", id=room_id):
                    member_ids = _room_member_ids(room_id)
                    if user_id not in member_ids or target not in member_ids:
                        continue
                    await manager.send_to_user(target, {**data, "from": user_id})

            elif event_type == "room_join":
                room_id = data.get("room_id")
                if database.find_one("rooms", id=room_id) and database.exists(
                    "room_members", room_id=room_id, user_id=user_id
                ):
                    await _send_room_event(
                        room_id,
                        {"type": "room_join", "user_id": user_id, "room_id": room_id,
                         "user": _user_payload(database.find_one("users", id=user_id))},
                        exclude=user_id,
                    )

            elif event_type == "room_leave":
                room_id = data.get("room_id")
                if database.find_one("rooms", id=room_id):
                    await _send_room_event(
                        room_id,
                        {"type": "room_leave", "user_id": user_id, "room_id": room_id,
                         "user": _user_payload(database.find_one("users", id=user_id))},
                        exclude=user_id,
                    )

            elif event_type == "pomodoro_start":
                room_id = data.get("room_id")
                if database.find_one("rooms", id=room_id):
                    await _send_room_event(
                        room_id,
                        {"type": "pomodoro_start", "room_id": room_id,
                         "duration": data.get("duration"), "user_id": user_id},
                        exclude=user_id,
                    )

            elif event_type == "pomodoro_stop":
                room_id = data.get("room_id")
                if database.find_one("rooms", id=room_id):
                    await _send_room_event(
                        room_id,
                        {"type": "pomodoro_stop", "room_id": room_id, "user_id": user_id},
                        exclude=user_id,
                    )

            elif event_type == "room_media_state":
                room_id = data.get("room_id")
                if database.find_one("rooms", id=room_id) and _is_room_member(room_id, user_id):
                    await _send_room_event(
                        room_id,
                        {"type": "room_media_state", "room_id": room_id, "user_id": user_id,
                         **_pick_fields(data, {"mic_on","cam_on","screen_sharing","hand_raised",
                                               "background_mode","background_color","background_image",
                                               "video_enabled","audio_enabled"})},
                        exclude=user_id,
                    )

            elif event_type == "room_whiteboard":
                room_id = data.get("room_id")
                if database.find_one("rooms", id=room_id) and _is_room_member(room_id, user_id):
                    await _send_room_event(
                        room_id,
                        {"type": "room_whiteboard", "room_id": room_id, "user_id": user_id,
                         **_pick_fields(data, {"action","tool","color","size","stroke",
                                               "points","page","snapshot","revision"})},
                        exclude=user_id,
                    )

            elif event_type == "room_screen_share":
                room_id = data.get("room_id")
                if database.find_one("rooms", id=room_id) and _is_room_member(room_id, user_id):
                    await _send_room_event(
                        room_id,
                        {"type": "room_screen_share", "room_id": room_id,
                         "user_id": user_id, **_pick_fields(data, {"active","label"})},
                        exclude=user_id,
                    )

            elif event_type == "chat":
                chat_id = data.get("chat_id")
                content = data.get("content", "").strip()
                if not chat_id or not content:
                    continue

                # Persist the message
                msg_record = {
                    "id":         uuid.uuid4().hex,
                    "chat_id":    chat_id,
                    "sender_id":  user_id,
                    "content":    content,
                    "created_at": _now(),
                    "is_read":    False,
                }
                database.insert("messages", msg_record)

                sender = _user_payload(database.find_one("users", id=user_id))
                broadcast_msg = {**msg_record, "type": "chat_message", "sender": sender}

                # Room chat: broadcast to all room members
                if isinstance(chat_id, str) and chat_id.startswith("room_"):
                    room_id = chat_id.removeprefix("room_")
                    await _send_room_event(room_id, broadcast_msg)
                else:
                    # DM / group chat: send to all conversation participants
                    conv = database.find_one("conversations", id=chat_id)
                    if conv:
                        participant_ids = conv.get("participant_ids", [])
                        await manager.send_to_users(participant_ids, broadcast_msg)

            elif event_type == "typing":
                chat_id = data.get("chat_id")
                if chat_id:
                    conv = database.find_one("conversations", id=chat_id)
                    if conv:
                        for pid in conv.get("participant_ids", []):
                            if pid != user_id:
                                await manager.send_to_user(
                                    pid, {"type": "typing", "chat_id": chat_id, "user_id": user_id}
                                )

            elif event_type == "stop_typing":
                chat_id = data.get("chat_id")
                if chat_id:
                    conv = database.find_one("conversations", id=chat_id)
                    if conv:
                        for pid in conv.get("participant_ids", []):
                            if pid != user_id:
                                await manager.send_to_user(
                                    pid, {"type": "stop_typing", "chat_id": chat_id, "user_id": user_id}
                                )

    except WebSocketDisconnect:
        manager.disconnect(websocket, user_id)
        await manager.broadcast(
            {"type": "presence", "user_id": user_id, "status": "offline"},
            exclude=user_id,
        )
    except Exception as e:
        logger.error("WS error for user %s: %s", user_id, e)
        manager.disconnect(websocket, user_id)


@app.get("/health")
async def health():
    return {
        "status": "ok",
        "data_dir":   DATA_DIR,
        "upload_dir": UPLOAD_DIR,
        "data_dir_exists":   os.path.isdir(DATA_DIR),
        "upload_dir_exists": os.path.isdir(UPLOAD_DIR),
    }
