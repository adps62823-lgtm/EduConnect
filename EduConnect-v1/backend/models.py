"""
models.py — Full EduConnect database schema
All SQLAlchemy ORM models with relationships.
"""

import uuid
from datetime import datetime, timezone
from sqlalchemy import (
    Column, String, Text, Integer, Float, Boolean,
    DateTime, ForeignKey, Table, Enum as SAEnum,
)
from sqlalchemy.orm import relationship
from database import Base


# ── Helpers ───────────────────────────────────────────────
def gen_id():
    return str(uuid.uuid4())

def now_utc():
    return datetime.now(timezone.utc)


# ══════════════════════════════════════════════════════════
# ASSOCIATION TABLES  (many-to-many)
# ══════════════════════════════════════════════════════════

post_likes = Table(
    "post_likes", Base.metadata,
    Column("user_id",  String, ForeignKey("users.id", ondelete="CASCADE")),
    Column("post_id",  String, ForeignKey("posts.id",  ondelete="CASCADE")),
)

post_tags = Table(
    "post_tags", Base.metadata,
    Column("post_id", String, ForeignKey("posts.id", ondelete="CASCADE")),
    Column("tag_id",  String, ForeignKey("tags.id",  ondelete="CASCADE")),
)

help_tags = Table(
    "help_tags", Base.metadata,
    Column("help_id", String, ForeignKey("help_requests.id", ondelete="CASCADE")),
    Column("tag_id",  String, ForeignKey("tags.id",          ondelete="CASCADE")),
)

answer_votes = Table(
    "answer_votes", Base.metadata,
    Column("user_id",   String, ForeignKey("users.id",   ondelete="CASCADE")),
    Column("answer_id", String, ForeignKey("answers.id", ondelete="CASCADE")),
    Column("vote",      Integer),   # +1 or -1
)

resource_likes = Table(
    "resource_likes", Base.metadata,
    Column("user_id",     String, ForeignKey("users.id",      ondelete="CASCADE")),
    Column("resource_id", String, ForeignKey("resources.id",  ondelete="CASCADE")),
)

followers = Table(
    "followers", Base.metadata,
    Column("follower_id",  String, ForeignKey("users.id", ondelete="CASCADE")),
    Column("following_id", String, ForeignKey("users.id", ondelete="CASCADE")),
)

room_members = Table(
    "room_members", Base.metadata,
    Column("room_id", String, ForeignKey("study_rooms.id", ondelete="CASCADE")),
    Column("user_id", String, ForeignKey("users.id",       ondelete="CASCADE")),
)

chat_participants = Table(
    "chat_participants", Base.metadata,
    Column("chat_id", String, ForeignKey("chats.id",  ondelete="CASCADE")),
    Column("user_id", String, ForeignKey("users.id",  ondelete="CASCADE")),
)

story_viewers = Table(
    "story_viewers", Base.metadata,
    Column("story_id", String, ForeignKey("stories.id", ondelete="CASCADE")),
    Column("user_id",  String, ForeignKey("users.id",   ondelete="CASCADE")),
)


# ══════════════════════════════════════════════════════════
# USER
# ══════════════════════════════════════════════════════════

class User(Base):
    __tablename__ = "users"

    id              = Column(String, primary_key=True, default=gen_id)
    name            = Column(String(120), nullable=False)
    username        = Column(String(50),  unique=True, nullable=False, index=True)
    email           = Column(String(200), unique=True, nullable=False, index=True)
    hashed_password = Column(String, nullable=False)

    # Profile
    avatar_url      = Column(String, nullable=True)
    cover_url       = Column(String, nullable=True)
    bio             = Column(Text,   nullable=True)
    grade           = Column(String(20),  nullable=True)   # "11", "12", "Dropper"
    school          = Column(String(200), nullable=True)
    region          = Column(String(100), nullable=True)
    language        = Column(String(50),  nullable=True)
    timezone        = Column(String(50),  nullable=True)   # "Asia/Kolkata"

    # Exam
    exam_target     = Column(String(50), nullable=True)    # JEE / NEET / UPSC …
    subjects        = Column(Text, nullable=True)          # JSON list string

    # Status
    study_status    = Column(
        SAEnum("studying", "break", "sleeping", "chilling", name="study_status_enum"),
        default="chilling",
    )
    study_timer_start = Column(DateTime(timezone=True), nullable=True)

    # Gamification
    help_points     = Column(Integer, default=0)
    reputation      = Column(Integer, default=0)

    # Role
    role            = Column(
        SAEnum("student", "mentor", "admin", name="role_enum"),
        default="student",
    )
    is_active       = Column(Boolean, default=True)
    is_verified     = Column(Boolean, default=False)

    created_at      = Column(DateTime(timezone=True), default=now_utc)
    updated_at      = Column(DateTime(timezone=True), default=now_utc, onupdate=now_utc)

    # ── Relationships ──
    posts           = relationship("Post",        back_populates="author",    cascade="all, delete-orphan")
    stories         = relationship("Story",       back_populates="author",    cascade="all, delete-orphan")
    comments        = relationship("Comment",     back_populates="author",    cascade="all, delete-orphan")
    help_requests   = relationship("HelpRequest", back_populates="author",    cascade="all, delete-orphan")
    answers         = relationship("Answer",      back_populates="author",    cascade="all, delete-orphan")
    notifications   = relationship("Notification",back_populates="user",      cascade="all, delete-orphan")
    resources       = relationship("Resource",    back_populates="uploader",  cascade="all, delete-orphan")
    college_reviews = relationship("CollegeReview",back_populates="author",   cascade="all, delete-orphan")
    streak          = relationship("Streak",      back_populates="user",      uselist=False, cascade="all, delete-orphan")
    theme_settings  = relationship("ThemeSettings", back_populates="user",   uselist=False, cascade="all, delete-orphan")
    exam_countdowns = relationship("ExamCountdown", back_populates="user",   cascade="all, delete-orphan")
    mentor_profile  = relationship("MentorProfile", back_populates="user",   uselist=False, cascade="all, delete-orphan")
    messages_sent   = relationship("Message",     back_populates="sender",   cascade="all, delete-orphan")
    journey_posts   = relationship("JourneyPost", back_populates="author",   cascade="all, delete-orphan")

    following       = relationship(
        "User", secondary=followers,
        primaryjoin=id == followers.c.follower_id,
        secondaryjoin=id == followers.c.following_id,
        backref="followers_list",
    )


# ══════════════════════════════════════════════════════════
# TAG  (shared across posts & help questions)
# ══════════════════════════════════════════════════════════

class Tag(Base):
    __tablename__ = "tags"

    id    = Column(String, primary_key=True, default=gen_id)
    name  = Column(String(80), unique=True, nullable=False, index=True)
    color = Column(String(7), default="#6366f1")  # hex


# ══════════════════════════════════════════════════════════
# FEED — POST
# ══════════════════════════════════════════════════════════

class Post(Base):
    __tablename__ = "posts"

    id          = Column(String, primary_key=True, default=gen_id)
    author_id   = Column(String, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    content     = Column(Text, nullable=False)
    image_urls  = Column(Text, nullable=True)   # JSON list of URLs
    post_type   = Column(
        SAEnum("feed", "journey", "anonymous", name="post_type_enum"),
        default="feed",
    )
    exam_stream = Column(String(50), nullable=True)  # filter by stream
    is_anonymous = Column(Boolean, default=False)
    views       = Column(Integer, default=0)
    created_at  = Column(DateTime(timezone=True), default=now_utc)
    updated_at  = Column(DateTime(timezone=True), default=now_utc, onupdate=now_utc)

    author      = relationship("User",    back_populates="posts")
    comments    = relationship("Comment", back_populates="post", cascade="all, delete-orphan")
    liked_by    = relationship("User",    secondary=post_likes, backref="liked_posts")
    tags        = relationship("Tag",     secondary=post_tags,  backref="posts")


# ── COMMENT ──────────────────────────────────────────────

class Comment(Base):
    __tablename__ = "comments"

    id        = Column(String, primary_key=True, default=gen_id)
    post_id   = Column(String, ForeignKey("posts.id",  ondelete="CASCADE"), nullable=False)
    author_id = Column(String, ForeignKey("users.id",  ondelete="CASCADE"), nullable=False)
    parent_id = Column(String, ForeignKey("comments.id", ondelete="CASCADE"), nullable=True)
    content   = Column(Text, nullable=False)
    created_at = Column(DateTime(timezone=True), default=now_utc)

    post      = relationship("Post",    back_populates="comments")
    author    = relationship("User",    back_populates="comments")
    replies   = relationship("Comment", backref="parent", remote_side="Comment.id")


# ── STORY ────────────────────────────────────────────────

class Story(Base):
    __tablename__ = "stories"

    id         = Column(String, primary_key=True, default=gen_id)
    author_id  = Column(String, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    media_url  = Column(String, nullable=False)
    media_type = Column(SAEnum("image", "video", name="media_type_enum"), default="image")
    caption    = Column(String(300), nullable=True)
    expires_at = Column(DateTime(timezone=True), nullable=False)
    created_at = Column(DateTime(timezone=True), default=now_utc)

    author     = relationship("User",  back_populates="stories")
    viewers    = relationship("User",  secondary=story_viewers, backref="viewed_stories")


# ── JOURNEY POST ─────────────────────────────────────────

class JourneyPost(Base):
    __tablename__ = "journey_posts"

    id            = Column(String, primary_key=True, default=gen_id)
    author_id     = Column(String, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    week_number   = Column(Integer, nullable=False)
    mock_score    = Column(Float,  nullable=True)
    topics_done   = Column(Text,   nullable=True)  # JSON list
    reflection    = Column(Text,   nullable=True)
    goals_next    = Column(Text,   nullable=True)
    created_at    = Column(DateTime(timezone=True), default=now_utc)

    author        = relationship("User", back_populates="journey_posts")


# ══════════════════════════════════════════════════════════
# HELP FORUM
# ══════════════════════════════════════════════════════════

class HelpRequest(Base):
    __tablename__ = "help_requests"

    id           = Column(String, primary_key=True, default=gen_id)
    author_id    = Column(String, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    title        = Column(String(300), nullable=False)
    body         = Column(Text,        nullable=False)
    subject      = Column(String(100), nullable=True)
    exam_target  = Column(String(50),  nullable=True)
    is_anonymous = Column(Boolean, default=False)
    status       = Column(
        SAEnum("open", "answered", "closed", name="help_status_enum"),
        default="open",
    )
    views        = Column(Integer, default=0)
    created_at   = Column(DateTime(timezone=True), default=now_utc)
    updated_at   = Column(DateTime(timezone=True), default=now_utc, onupdate=now_utc)

    author       = relationship("User",   back_populates="help_requests")
    answers      = relationship("Answer", back_populates="question", cascade="all, delete-orphan")
    tags         = relationship("Tag",    secondary=help_tags, backref="help_requests")


class Answer(Base):
    __tablename__ = "answers"

    id          = Column(String, primary_key=True, default=gen_id)
    question_id = Column(String, ForeignKey("help_requests.id", ondelete="CASCADE"), nullable=False)
    author_id   = Column(String, ForeignKey("users.id",         ondelete="CASCADE"), nullable=False)
    content     = Column(Text, nullable=False)
    is_accepted = Column(Boolean, default=False)
    vote_count  = Column(Integer, default=0)
    created_at  = Column(DateTime(timezone=True), default=now_utc)
    updated_at  = Column(DateTime(timezone=True), default=now_utc, onupdate=now_utc)

    question    = relationship("HelpRequest", back_populates="answers")
    author      = relationship("User",        back_populates="answers")


# ══════════════════════════════════════════════════════════
# CHAT
# ══════════════════════════════════════════════════════════

class Chat(Base):
    __tablename__ = "chats"

    id         = Column(String, primary_key=True, default=gen_id)
    name       = Column(String(150), nullable=True)   # None for DMs
    is_group   = Column(Boolean, default=False)
    avatar_url = Column(String,  nullable=True)
    created_by = Column(String, ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    created_at = Column(DateTime(timezone=True), default=now_utc)

    participants = relationship("User",    secondary=chat_participants, backref="chats")
    messages     = relationship("Message", back_populates="chat", cascade="all, delete-orphan")


class Message(Base):
    __tablename__ = "messages"

    id          = Column(String, primary_key=True, default=gen_id)
    chat_id     = Column(String, ForeignKey("chats.id",  ondelete="CASCADE"), nullable=False)
    sender_id   = Column(String, ForeignKey("users.id",  ondelete="CASCADE"), nullable=False)
    content     = Column(Text,   nullable=True)
    media_url   = Column(String, nullable=True)
    media_type  = Column(String(20), nullable=True)   # "image" / "file" / "audio"
    is_read     = Column(Boolean, default=False)
    created_at  = Column(DateTime(timezone=True), default=now_utc)

    chat        = relationship("Chat", back_populates="messages")
    sender      = relationship("User", back_populates="messages_sent")


# ══════════════════════════════════════════════════════════
# MENTOR
# ══════════════════════════════════════════════════════════

class MentorProfile(Base):
    __tablename__ = "mentor_profiles"

    id             = Column(String, primary_key=True, default=gen_id)
    user_id        = Column(String, ForeignKey("users.id", ondelete="CASCADE"), unique=True, nullable=False)
    headline       = Column(String(200), nullable=True)
    subjects       = Column(Text, nullable=True)     # JSON list
    exam_target    = Column(String(50), nullable=True)
    language       = Column(String(50), nullable=True)
    region         = Column(String(100), nullable=True)
    rating         = Column(Float, default=0.0)
    total_sessions = Column(Integer, default=0)
    availability   = Column(Text, nullable=True)     # JSON schedule
    is_available   = Column(Boolean, default=True)
    created_at     = Column(DateTime(timezone=True), default=now_utc)

    user           = relationship("User", back_populates="mentor_profile")
    requests       = relationship("MentorRequest", back_populates="mentor", cascade="all, delete-orphan")
    reviews        = relationship("MentorReview",  back_populates="mentor", cascade="all, delete-orphan")


class MentorRequest(Base):
    __tablename__ = "mentor_requests"

    id         = Column(String, primary_key=True, default=gen_id)
    from_user  = Column(String, ForeignKey("users.id",           ondelete="CASCADE"), nullable=False)
    mentor_id  = Column(String, ForeignKey("mentor_profiles.id", ondelete="CASCADE"), nullable=False)
    message    = Column(Text,   nullable=True)
    subject    = Column(String(100), nullable=True)
    status     = Column(
        SAEnum("pending", "accepted", "rejected", name="mentor_req_status"),
        default="pending",
    )
    created_at = Column(DateTime(timezone=True), default=now_utc)

    mentor     = relationship("MentorProfile", back_populates="requests")


class MentorReview(Base):
    __tablename__ = "mentor_reviews"

    id         = Column(String, primary_key=True, default=gen_id)
    mentor_id  = Column(String, ForeignKey("mentor_profiles.id", ondelete="CASCADE"), nullable=False)
    reviewer_id = Column(String, ForeignKey("users.id",          ondelete="CASCADE"), nullable=False)
    rating     = Column(Float, nullable=False)
    content    = Column(Text,  nullable=True)
    created_at = Column(DateTime(timezone=True), default=now_utc)

    mentor     = relationship("MentorProfile", back_populates="reviews")


# ══════════════════════════════════════════════════════════
# STUDY ROOM
# ══════════════════════════════════════════════════════════

class StudyRoom(Base):
    __tablename__ = "study_rooms"

    id          = Column(String, primary_key=True, default=gen_id)
    name        = Column(String(150), nullable=False)
    host_id     = Column(String, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    subject     = Column(String(100), nullable=True)
    exam_target = Column(String(50),  nullable=True)
    max_members = Column(Integer, default=5)
    is_active   = Column(Boolean, default=True)
    is_public   = Column(Boolean, default=True)
    password    = Column(String,  nullable=True)   # None = open room
    pomodoro_duration = Column(Integer, default=25)  # minutes
    started_at  = Column(DateTime(timezone=True), default=now_utc)
    ended_at    = Column(DateTime(timezone=True), nullable=True)

    host        = relationship("User", foreign_keys=[host_id])
    members     = relationship("User", secondary=room_members, backref="study_rooms")


# ══════════════════════════════════════════════════════════
# RESOURCES
# ══════════════════════════════════════════════════════════

class Resource(Base):
    __tablename__ = "resources"

    id               = Column(String, primary_key=True, default=gen_id)
    uploader_id      = Column(String, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    title            = Column(String(300), nullable=False)
    description      = Column(Text,   nullable=True)
    file_url         = Column(String, nullable=False)
    file_type        = Column(String(20), nullable=True)    # "pdf" / "image" / "link"
    subject          = Column(String(100), nullable=True)
    exam_target      = Column(String(50),  nullable=True)
    resource_type    = Column(
        SAEnum("notes", "book", "video", "link", "other", name="resource_type_enum"),
        default="notes",
    )
    help_points_cost = Column(Integer, default=0)
    downloads        = Column(Integer, default=0)
    created_at       = Column(DateTime(timezone=True), default=now_utc)

    uploader         = relationship("User",  back_populates="resources")
    liked_by         = relationship("User",  secondary=resource_likes, backref="liked_resources")


# ══════════════════════════════════════════════════════════
# COLLEGE REVIEWS
# ══════════════════════════════════════════════════════════

class College(Base):
    __tablename__ = "colleges"

    id          = Column(String, primary_key=True, default=gen_id)
    name        = Column(String(300), unique=True, nullable=False)
    location    = Column(String(200), nullable=True)
    courses     = Column(Text, nullable=True)    # JSON list
    website     = Column(String, nullable=True)
    avg_rating  = Column(Float, default=0.0)
    created_at  = Column(DateTime(timezone=True), default=now_utc)

    reviews     = relationship("CollegeReview", back_populates="college", cascade="all, delete-orphan")


class CollegeReview(Base):
    __tablename__ = "college_reviews"

    id                = Column(String, primary_key=True, default=gen_id)
    college_id        = Column(String, ForeignKey("colleges.id", ondelete="CASCADE"), nullable=False)
    author_id         = Column(String, ForeignKey("users.id",    ondelete="CASCADE"), nullable=False)
    rating            = Column(Float, nullable=False)
    content           = Column(Text,  nullable=False)
    year_of_admission = Column(Integer, nullable=True)
    course            = Column(String(150), nullable=True)
    pros              = Column(Text, nullable=True)
    cons              = Column(Text, nullable=True)
    created_at        = Column(DateTime(timezone=True), default=now_utc)

    college           = relationship("College", back_populates="reviews")
    author            = relationship("User",    back_populates="college_reviews")


# ══════════════════════════════════════════════════════════
# GAMIFICATION
# ══════════════════════════════════════════════════════════

class Streak(Base):
    __tablename__ = "streaks"

    id              = Column(String, primary_key=True, default=gen_id)
    user_id         = Column(String, ForeignKey("users.id", ondelete="CASCADE"), unique=True, nullable=False)
    current_streak  = Column(Integer, default=0)
    longest_streak  = Column(Integer, default=0)
    last_active_date = Column(DateTime(timezone=True), nullable=True)
    total_study_mins = Column(Integer, default=0)

    user            = relationship("User", back_populates="streak")


class Badge(Base):
    __tablename__ = "badges"

    id          = Column(String, primary_key=True, default=gen_id)
    name        = Column(String(100), unique=True, nullable=False)
    description = Column(Text, nullable=True)
    icon        = Column(String(10), nullable=True)   # emoji
    condition   = Column(String(200), nullable=True)  # e.g. "streak>=7"


class UserBadge(Base):
    __tablename__ = "user_badges"

    id         = Column(String, primary_key=True, default=gen_id)
    user_id    = Column(String, ForeignKey("users.id",  ondelete="CASCADE"), nullable=False)
    badge_id   = Column(String, ForeignKey("badges.id", ondelete="CASCADE"), nullable=False)
    awarded_at = Column(DateTime(timezone=True), default=now_utc)


class StreakWar(Base):
    __tablename__ = "streak_wars"

    id          = Column(String, primary_key=True, default=gen_id)
    name        = Column(String(200), nullable=False)
    war_type    = Column(SAEnum("class", "school", name="war_type_enum"), default="class")
    team_a      = Column(String(200), nullable=False)   # class/school name
    team_b      = Column(String(200), nullable=False)
    score_a     = Column(Integer, default=0)
    score_b     = Column(Integer, default=0)
    starts_at   = Column(DateTime(timezone=True), nullable=False)
    ends_at     = Column(DateTime(timezone=True), nullable=False)
    created_at  = Column(DateTime(timezone=True), default=now_utc)


# ══════════════════════════════════════════════════════════
# NOTIFICATIONS
# ══════════════════════════════════════════════════════════

class Notification(Base):
    __tablename__ = "notifications"

    id         = Column(String, primary_key=True, default=gen_id)
    user_id    = Column(String, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    type       = Column(String(50), nullable=False)   # "like" / "comment" / "answer" / "follow" …
    content    = Column(Text, nullable=False)
    link       = Column(String, nullable=True)         # e.g. "/feed/post/abc"
    is_read    = Column(Boolean, default=False)
    created_at = Column(DateTime(timezone=True), default=now_utc)

    user       = relationship("User", back_populates="notifications")


# ══════════════════════════════════════════════════════════
# EXAM COUNTDOWN
# ══════════════════════════════════════════════════════════

class ExamCountdown(Base):
    __tablename__ = "exam_countdowns"

    id         = Column(String, primary_key=True, default=gen_id)
    user_id    = Column(String, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    exam_name  = Column(String(100), nullable=False)
    exam_date  = Column(DateTime(timezone=True), nullable=False)
    created_at = Column(DateTime(timezone=True), default=now_utc)

    user       = relationship("User", back_populates="exam_countdowns")


# ══════════════════════════════════════════════════════════
# THEME / CUSTOMIZATION
# ══════════════════════════════════════════════════════════

class ThemeSettings(Base):
    __tablename__ = "theme_settings"

    id                = Column(String, primary_key=True, default=gen_id)
    user_id           = Column(String, ForeignKey("users.id", ondelete="CASCADE"), unique=True, nullable=False)
    theme             = Column(SAEnum("dark", "light", "custom", name="theme_enum"), default="dark")
    primary_color     = Column(String(7),  default="#6366f1")   # hex
    accent_color      = Column(String(7),  default="#f59e0b")
    background_color  = Column(String(7),  default="#0f0f1a")
    background_wallpaper = Column(String, nullable=True)        # URL
    navbar_position   = Column(SAEnum("top", "bottom", "left", name="navbar_pos"), default="bottom")
    font_size         = Column(SAEnum("small", "medium", "large", name="font_size_enum"), default="medium")
    animations        = Column(Boolean, default=True)
    # Positions stored as JSON strings: {"x": 0, "y": 0}
    statusbar_position = Column(String, default='{"x":0,"y":0}')
    created_at        = Column(DateTime(timezone=True), default=now_utc)
    updated_at        = Column(DateTime(timezone=True), default=now_utc, onupdate=now_utc)

    user              = relationship("User", back_populates="theme_settings")
