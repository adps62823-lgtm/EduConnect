import os
import logging
from contextlib import asynccontextmanager
from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import JSONResponse
from dotenv import load_dotenv

import database  # JSON store — creates data/ dir on import
from routes.auth_routes import router as auth_router
from routes.feed_routes import router as feed_router
from routes.help_routes import router as help_router
from routes.chat_routes import router as chat_router
from routes.mentor_routes import router as mentor_router
from routes.room_routes import router as room_router
from routes.resource_routes import router as resource_router
from routes.profile_routes import router as profile_router
from routes.college_routes import router as college_router
from routes.gamification_routes import router as gamification_router

# ── Load env ──────────────────────────────────────────────
load_dotenv()

# ── Logging ───────────────────────────────────────────────
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("educonnect")

# ── WebSocket Connection Manager ──────────────────────────
class ConnectionManager:
    def __init__(self):
        # user_id → list of WebSocket connections
        self.active: dict[str, list[WebSocket]] = {}

    async def connect(self, websocket: WebSocket, user_id: str):
        await websocket.accept()
        self.active.setdefault(user_id, []).append(websocket)
        logger.info(f"WS connected: user={user_id}")

    def disconnect(self, websocket: WebSocket, user_id: str):
        conns = self.active.get(user_id, [])
        if websocket in conns:
            conns.remove(websocket)
        if not conns:
            self.active.pop(user_id, None)
        logger.info(f"WS disconnected: user={user_id}")

    async def send_to_user(self, user_id: str, message: dict):
        for ws in self.active.get(user_id, []):
            try:
                await ws.send_json(message)
            except Exception:
                pass

    async def broadcast(self, message: dict, exclude: str = None):
        for uid, conns in self.active.items():
            if uid == exclude:
                continue
            for ws in conns:
                try:
                    await ws.send_json(message)
                except Exception:
                    pass

    def online_users(self) -> list[str]:
        return list(self.active.keys())


manager = ConnectionManager()


# ── Lifespan (startup / shutdown) ─────────────────────────
@asynccontextmanager
async def lifespan(app: FastAPI):
    # Ensure uploads dirs exist
    for _subdir in ["avatars", "covers", "posts", "stories", "resources", "wallpapers", "chat"]:
        os.makedirs(os.path.join("uploads", _subdir), exist_ok=True)
    logger.info("✅ EduConnect backend started — using JSON flat-file store")
    yield
    logger.info("🛑 EduConnect backend shutting down")


# ── App ───────────────────────────────────────────────────
app = FastAPI(
    title="EduConnect API",
    description="Educational Social Media Platform API",
    version=os.getenv("APP_VERSION", "1.0.0"),
    lifespan=lifespan,
)

# Store manager on app state so routes can access it
app.state.manager = manager

# ── CORS ──────────────────────────────────────────────────
origins = [
    os.getenv("FRONTEND_URL", "http://localhost:5173"),
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

app.mount("/uploads", StaticFiles(directory="uploads"), name="uploads")

# ── Routers ───────────────────────────────────────────────
app.include_router(auth_router,         prefix="/api/auth",         tags=["Auth"])
app.include_router(feed_router,         prefix="/api/feed",         tags=["Feed"])
app.include_router(help_router,         prefix="/api/help",         tags=["Help Forum"])
app.include_router(chat_router,         prefix="/api/chat",         tags=["Chat"])
app.include_router(mentor_router,       prefix="/api/mentor",       tags=["Mentor"])
app.include_router(room_router,         prefix="/api/rooms",        tags=["Study Rooms"])
app.include_router(resource_router,     prefix="/api/resources",    tags=["Resources"])
app.include_router(profile_router,      prefix="/api/profile",      tags=["Profile"])
app.include_router(college_router,      prefix="/api/colleges",     tags=["Colleges"])
app.include_router(gamification_router, prefix="/api/gamification", tags=["Gamification"])


# ── WebSocket Endpoint ────────────────────────────────────
@app.websocket("/ws/{user_id}")
async def websocket_endpoint(websocket: WebSocket, user_id: str):
    import database as _db
    await manager.connect(websocket, user_id)
    # Notify others this user is online (frontend listens for `presence`)
    await manager.broadcast(
        {"type": "presence", "user_id": user_id, "status": "online"},
        exclude=user_id,
    )
    try:
        while True:
            data = await websocket.receive_json()
            event_type = data.get("type")

            # ── Presence (online/offline) ──
            if event_type == "presence":
                await manager.broadcast(
                    {"type": "presence", "user_id": user_id,
                     "status": data.get("status", "online")},
                    exclude=user_id,
                )

            # ── Typing indicator ──
            elif event_type == "typing":
                chat_id = data.get("chat_id")
                conv = _db.find_one("conversations", id=chat_id)
                if conv:
                    for pid in conv.get("participant_ids", []):
                        if pid != user_id:
                            await manager.send_to_user(pid, {
                                "type": "typing",
                                "user_id": user_id,
                                "chat_id": chat_id,
                            })

            elif event_type == "stop_typing":
                chat_id = data.get("chat_id")
                conv = _db.find_one("conversations", id=chat_id)
                if conv:
                    for pid in conv.get("participant_ids", []):
                        if pid != user_id:
                            await manager.send_to_user(pid, {
                                "type": "stop_typing",
                                "user_id": user_id,
                                "chat_id": chat_id,
                            })

            # ── Study room WebRTC signalling ──
            elif event_type in ("webrtc_offer", "webrtc_answer", "webrtc_ice",
                                "offer", "answer", "ice_candidate"):
                target = data.get("to")
                if target:
                    await manager.send_to_user(target, {**data, "from": user_id})

            # ── Study room join/leave broadcasts ──
            elif event_type == "room_join":
                room_id = data.get("room_id")
                await manager.broadcast(
                    {"type": "room_join", "user_id": user_id, "room_id": room_id},
                    exclude=user_id,
                )

            elif event_type == "room_leave":
                room_id = data.get("room_id")
                await manager.broadcast(
                    {"type": "room_leave", "user_id": user_id, "room_id": room_id},
                    exclude=user_id,
                )

            # ── Ping / heartbeat ──
            elif event_type == "ping":
                await websocket.send_json({"type": "pong"})

    except WebSocketDisconnect:
        manager.disconnect(websocket, user_id)
        await manager.broadcast(
            {"type": "presence", "user_id": user_id, "status": "offline"},
            exclude=user_id,
        )


# ── Health Check ──────────────────────────────────────────
@app.get("/api/health", tags=["System"])
async def health():
    return {
        "status": "ok",
        "app": os.getenv("APP_NAME", "EduConnect"),
        "version": os.getenv("APP_VERSION", "1.0.0"),
        "online_users": len(manager.online_users()),
    }


# ── Online Users ──────────────────────────────────────────
@app.get("/api/online-users", tags=["System"])
async def online_users():
    return {"online_user_ids": manager.online_users()}


# ── Global Exception Handler ──────────────────────────────
@app.exception_handler(Exception)
async def global_exception_handler(request, exc):
    logger.error(f"Unhandled exception: {exc}", exc_info=True)
    return JSONResponse(
        status_code=500,
        content={"detail": "Internal server error. Please try again."},
    )


# ── Dev Run ───────────────────────────────────────────────
if __name__ == "__main__":
    import uvicorn
    uvicorn.run(
        "main:app",
        host="0.0.0.0",
        port=8000,
        reload=True,
        log_level="info",
    )
