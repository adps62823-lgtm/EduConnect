import os
from sqlalchemy import create_engine, event
from sqlalchemy.orm import sessionmaker, DeclarativeBase
from sqlalchemy.pool import StaticPool
from dotenv import load_dotenv

load_dotenv()

# ── Database URL ──────────────────────────────────────────
DATABASE_URL = os.getenv("DATABASE_URL", "sqlite:///./educonnect.db")

# ── Engine ────────────────────────────────────────────────
# SQLite-specific config: enable WAL mode for better concurrent reads,
# and enforce foreign keys (SQLite doesn't do this by default).
if DATABASE_URL.startswith("sqlite"):
    engine = create_engine(
        DATABASE_URL,
        connect_args={"check_same_thread": False},
        # StaticPool keeps one connection open — fine for SQLite dev
        poolclass=StaticPool,
        echo=os.getenv("DEBUG", "false").lower() == "true",
    )

    @event.listens_for(engine, "connect")
    def set_sqlite_pragmas(dbapi_conn, connection_record):
        cursor = dbapi_conn.cursor()
        # Enable Write-Ahead Logging for concurrent reads
        cursor.execute("PRAGMA journal_mode=WAL")
        # Enforce foreign key constraints
        cursor.execute("PRAGMA foreign_keys=ON")
        # Faster writes (safe for local dev)
        cursor.execute("PRAGMA synchronous=NORMAL")
        cursor.close()

else:
    # PostgreSQL / MySQL — drop in replacement when scaling up
    engine = create_engine(
        DATABASE_URL,
        pool_pre_ping=True,
        pool_size=10,
        max_overflow=20,
        echo=os.getenv("DEBUG", "false").lower() == "true",
    )

# ── Session Factory ───────────────────────────────────────
SessionLocal = sessionmaker(
    autocommit=False,
    autoflush=False,
    bind=engine,
)

# ── Declarative Base ─────────────────────────────────────
class Base(DeclarativeBase):
    pass

# ── Dependency — yields a DB session per request ─────────
def get_db():
    """
    FastAPI dependency that provides a SQLAlchemy session.
    Always closes the session after the request, even on error.

    Usage in a route:
        @router.get("/something")
        def my_route(db: Session = Depends(get_db)):
            ...
    """
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
