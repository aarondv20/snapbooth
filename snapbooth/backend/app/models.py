import uuid
import secrets
from datetime import datetime, timezone, timedelta

from sqlalchemy import Column, String, Integer, Boolean, DateTime, JSON, Text
from app.database import Base


def _generate_uuid() -> str:
    return str(uuid.uuid4())


def _generate_token() -> str:
    return secrets.token_urlsafe(32)


LAYOUT_SLOTS = {"single": 1, "2x1_side": 3, "strip": 4, "2x2": 4}


class PhotoSession(Base):
    """A shared photobooth session supporting async multi-participant layouts."""

    __tablename__ = "photo_sessions"

    id = Column(String, primary_key=True, default=_generate_uuid)
    invite_token = Column(String, unique=True, index=True, default=_generate_token)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))
    expires_at = Column(DateTime, default=lambda: datetime.now(timezone.utc) + timedelta(hours=24))
    layout = Column(String, default="single")
    max_participants = Column(Integer, default=1)
    label = Column(String, nullable=True)
    frame_type = Column(String, default="simple")
    filter_name = Column(String, default="normal")
    status = Column(String, default="waiting")  # waiting, complete, expired
    composite_filename = Column(String, nullable=True)
    participants_data = Column(JSON, default=list)  # list of {slot, filename, thumb_filename}
    creator_id = Column(String, nullable=True)  # anonymous device ID of session creator
    participant_ids = Column(JSON, default=list, nullable=True)  # anonymous device IDs, index-aligned with participants_data


class CapturedImage(Base):
    """Metadata for each individual captured image within a session."""

    __tablename__ = "captured_images"

    id = Column(String, primary_key=True, default=_generate_uuid)
    session_id = Column(String, index=True, nullable=False)
    filename = Column(String, nullable=False)
    thumbnail_filename = Column(String, nullable=True)
    original_filename = Column(String, nullable=True)
    filter_applied = Column(String, default="normal")
    layout_position = Column(Integer, default=0)
    width = Column(Integer, nullable=True)
    height = Column(Integer, nullable=True)
    file_size = Column(Integer, nullable=True)
    is_favourite = Column(Boolean, default=False)
    is_archived = Column(Boolean, default=False)
    layout = Column(String, default="single")
    custom_text = Column(Text, nullable=True)
    stickers_data = Column(JSON, nullable=True)
    owner_ids = Column(JSON, default=list, nullable=True)  # anonymous device IDs with access to this photo
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))
