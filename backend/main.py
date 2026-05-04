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


def _now() -> str:
    return datetime.now(timezone.utc).isoformat()


def _user_payload(user: dict | None) -> dict | None:
    if not user:
        return None
    return {
        "id": user["id"],
        "name": user["name"],
        "username": user["username"],
        "avatar_url": user.get("avatar_url"),
    }


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
        logger.info("WS disconnected: user=%s", user_id)

    async def send_to_user(self, user_id: str, message: dict):
        for ws in self.active.get(user_id, []):
            try:
                await ws.send_json(message)
            except Exception:
                pass

    async def send_to_users(self, user_ids: list[str], message: dict, exclude: str | None = None):
        for target_user_id in set(user_ids):
            if exclude and target_user_id == exclude:
                continue
            await self.send_to_user(target_user_id, message)

    async def broadcast(self, message: dict, exclude: str | None = None):
        for user_id, conns in self.active.items():
            if exclude and user_id == exclude:
                continue
            for ws in conns:
                try:
                    await ws.send_json(message)
                except Exception:
                    pass

    def online_users(self) -> list[str]:
        return list(self.active.keys())


manager = ConnectionManager()


async def _send_room_event(room_id: str, message: dict, exclude: str | None = None):
    member_ids = [
        row["user_id"]
        for row in database.find_many("room_members", room_id=room_id)
        if row.get("user_id")
    ]
    if member_ids:
        await manager.send_to_users(member_ids, message, exclude=exclude)


@asynccontextmanager
async def lifespan(app: FastAPI):
    for subdir in ["avatars", "covers", "posts", "stories", "resources", "wallpapers", "chat"]:
        os.makedirs(os.path.join("uploads", subdir), exist_ok=True)
    logger.info("EduConnect backend started with JSON flat-file store")
    yield
    logger.info("EduConnect backend shutting down")


app = FastAPI(
    title="EduConnect API",
    description="Educational Social Media Platform API",
    version=os.getenv("APP_VERSION", "1.0.0"),
    lifespan=lifespan,
)

app.state.manager = manager

origins = [
    os.getenv("FRONTEND_URL", "http://localhost:5173"),
    "http://localhost:3000",
    "http://127.0.0.1:5173",
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.mount("/uploads", StaticFiles(directory="uploads"), name="uploads")

app.include_router(auth_router, prefix="/api/auth", tags=["Auth"])
app.include_router(feed_router, prefix="/api/feed", tags=["Feed"])
app.include_router(help_router, prefix="/api/help", tags=["Help Forum"])
app.include_router(chat_router, prefix="/api/chat", tags=["Chat"])
app.include_router(mentor_router, prefix="/api/mentor", tags=["Mentor"])
app.include_router(room_router, prefix="/api/rooms", tags=["Study Rooms"])
app.include_router(resource_router, prefix="/api/resources", tags=["Resources"])
app.include_router(profile_router, prefix="/api/profile", tags=["Profile"])
app.include_router(college_router, prefix="/api/colleges", tags=["Colleges"])
app.include_router(gamification_router, prefix="/api/gamification", tags=["Gamification"])


@app.websocket("/ws/{user_id}")
async def websocket_endpoint(websocket: WebSocket, user_id: str):
    await manager.connect(websocket, user_id)

    for online_user_id in manager.online_users():
        if online_user_id == user_id:
            continue
        await manager.send_to_user(user_id, {
            "type": "presence",
            "user_id": online_user_id,
            "status": "online",
        })

    await manager.broadcast(
        {"type": "presence", "user_id": user_id, "status": "online"},
        exclude=user_id,
    )

    try:
        while True:
            data = await websocket.receive_json()
            event_type = data.get("type")

            if event_type == "presence":
                await manager.broadcast(
                    {
                        "type": "presence",
                        "user_id": user_id,
                        "status": data.get("status", "online"),
                    },
                    exclude=user_id,
                )

            elif event_type == "typing":
                chat_id = data.get("chat_id")
                conv = database.find_one("conversations", id=chat_id)
                if conv:
                    await manager.send_to_users(
                        conv.get("participant_ids", []),
                        {
                            "type": "typing",
                            "user_id": user_id,
                            "chat_id": chat_id,
                        },
                        exclude=user_id,
                    )

            elif event_type == "stop_typing":
                chat_id = data.get("chat_id")
                conv = database.find_one("conversations", id=chat_id)
                if conv:
                    await manager.send_to_users(
                        conv.get("participant_ids", []),
                        {
                            "type": "stop_typing",
                            "user_id": user_id,
                            "chat_id": chat_id,
                        },
                        exclude=user_id,
                    )

            elif event_type == "chat":
                chat_id = data.get("chat_id")
                content = (data.get("content") or "").strip()
                if not chat_id or not content:
                    continue

                sender = database.find_one("users", id=user_id)
                payload = {
                    "type": "chat",
                    "id": uuid.uuid4().hex,
                    "chat_id": chat_id,
                    "sender_id": user_id,
                    "sender": _user_payload(sender),
                    "content": content,
                    "media_url": None,
                    "media_type": None,
                    "is_read": False,
                    "created_at": _now(),
                }

                if chat_id.startswith("room_"):
                    room_id = chat_id.removeprefix("room_")
                    if database.find_one("rooms", id=room_id) and database.exists(
                        "room_members", room_id=room_id, user_id=user_id
                    ):
                        await _send_room_event(room_id, payload, exclude=user_id)
                else:
                    conv = database.find_one("conversations", id=chat_id)
                    if conv and user_id in conv.get("participant_ids", []):
                        await manager.send_to_users(
                            conv.get("participant_ids", []),
                            payload,
                            exclude=user_id,
                        )

            elif event_type in ("webrtc_offer", "webrtc_answer", "webrtc_ice", "offer", "answer", "ice_candidate"):
                target = data.get("to")
                if target:
                    await manager.send_to_user(target, {**data, "from": user_id})

            elif event_type == "room_join":
                room_id = data.get("room_id")
                if database.find_one("rooms", id=room_id) and database.exists(
                    "room_members", room_id=room_id, user_id=user_id
                ):
                    await _send_room_event(
                        room_id,
                        {
                            "type": "room_join",
                            "user_id": user_id,
                            "room_id": room_id,
                            "user": _user_payload(database.find_one("users", id=user_id)),
                        },
                        exclude=user_id,
                    )

            elif event_type == "room_leave":
                room_id = data.get("room_id")
                if database.find_one("rooms", id=room_id):
                    await _send_room_event(
                        room_id,
                        {
                            "type": "room_leave",
                            "user_id": user_id,
                            "room_id": room_id,
                            "user": _user_payload(database.find_one("users", id=user_id)),
                        },
                        exclude=user_id,
                    )

            elif event_type == "pomodoro_start":
                room_id = data.get("room_id")
                if database.find_one("rooms", id=room_id):
                    await _send_room_event(
                        room_id,
                        {
                            "type": "pomodoro_start",
                            "room_id": room_id,
                            "duration": data.get("duration"),
                            "user_id": user_id,
                        },
                        exclude=user_id,
                    )

            elif event_type == "pomodoro_stop":
                room_id = data.get("room_id")
                if database.find_one("rooms", id=room_id):
                    await _send_room_event(
                        room_id,
                        {
                            "type": "pomodoro_stop",
                            "room_id": room_id,
                            "user_id": user_id,
                        },
                        exclude=user_id,
                    )

            elif event_type == "ping":
                await websocket.send_json({"type": "pong"})

    except WebSocketDisconnect:
        manager.disconnect(websocket, user_id)
        await manager.broadcast(
            {"type": "presence", "user_id": user_id, "status": "offline"},
            exclude=user_id,
        )


@app.get("/api/health", tags=["System"])
async def health():
    return {
        "status": "ok",
        "app": os.getenv("APP_NAME", "EduConnect"),
        "version": os.getenv("APP_VERSION", "1.0.0"),
        "online_users": len(manager.online_users()),
    }


@app.get("/api/online-users", tags=["System"])
async def online_users():
    return {"online_user_ids": manager.online_users()}


@app.exception_handler(Exception)
async def global_exception_handler(request, exc):
    logger.error("Unhandled exception: %s", exc, exc_info=True)
    return JSONResponse(
        status_code=500,
        content={"detail": "Internal server error. Please try again."},
    )


if __name__ == "__main__":
    import uvicorn

    uvicorn.run(
        "main:app",
        host="0.0.0.0",
        port=8000,
        reload=True,
        log_level="info",
    )
