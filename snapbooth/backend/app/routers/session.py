import os
import uuid
import logging
from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from sqlalchemy import asc

from app.database import get_db
from app.models import PhotoSession, CapturedImage, LAYOUT_SLOTS
from app.schemas import (
    CreateSessionRequest, CreateSessionResponse,
    SessionInfoResponse, ParticipantInfo,
    JoinSessionRequest,
)
from PIL import Image as PILImage
from app.services.image_processor import _decode_base64_to_pil, apply_filter, apply_frame_effect, create_thumbnail, create_layout_image, create_session_composite
from app.config import settings

logger = logging.getLogger("snapbooth.session")

router = APIRouter(prefix="/api/sessions", tags=["sessions"])


def _utcnow():
    return datetime.now(timezone.utc).replace(tzinfo=None)


def _is_expired(session: PhotoSession) -> bool:
    return _utcnow() > session.expires_at.replace(tzinfo=None) if session.expires_at else False


def _get_participants(session: PhotoSession) -> list:
    """Return participant list from session's JSON field."""
    return session.participants_data or []


def _save_participant_image(image_data: str, filter_name: str) -> dict:
    """Save a participant image, return {filename, thumb_filename, width, height, file_size}."""
    pil = _decode_base64_to_pil(image_data)
    pil = apply_filter(pil, filter_name)
    pil = pil.convert("RGB")

    max_dim = settings.MAX_IMAGE_SIZE
    if max(pil.width, pil.height) > max_dim:
        ratio = max_dim / max(pil.width, pil.height)
        pil = pil.resize((int(pil.width * ratio), int(pil.height * ratio)), PILImage.LANCZOS)

    file_id = uuid.uuid4().hex
    filename = f"{file_id}.jpg"
    filepath = os.path.join(settings.UPLOAD_DIR, filename)
    pil.save(filepath, "JPEG", quality=settings.JPEG_QUALITY)

    thumb = create_thumbnail(pil)
    thumb_filename = f"{file_id}_thumb.jpg"
    thumb_path = os.path.join(settings.UPLOAD_DIR, thumb_filename)
    thumb.save(thumb_path, "JPEG", quality=80)

    return {
        "filename": filename,
        "thumb_filename": thumb_filename,
        "width": pil.width,
        "height": pil.height,
        "file_size": os.path.getsize(filepath),
    }


def _finalize_session(session: PhotoSession, db: Session):
    """Generate the final composite, save as gallery entry."""
    participants = list(_get_participants(session))  # copy
    if not participants:
        return

    image_paths = [p["filename"] for p in participants]
    composite_filename = f"composite_{session.id}.jpg"
    output_path = os.path.join(settings.UPLOAD_DIR, composite_filename)

    try:
        create_session_composite(image_paths, session.layout, session.frame_type, output_path, settings.UPLOAD_DIR)
        session.composite_filename = composite_filename

        # Add composite to gallery (CapturedImage)
        composite_img = CapturedImage(
            id=str(uuid.uuid4()),
            session_id=session.id,
            filename=composite_filename,
            thumbnail_filename=composite_filename,
            filter_applied=session.filter_name or "normal",
            layout_position=0,
            width=0,
            height=0,
            file_size=os.path.getsize(output_path),
            layout=session.layout,
            created_at=_utcnow(),
        )
        db.add(composite_img)
        session.status = "complete"
        db.commit()
        logger.info(f"[Session] Finalized session {session.id}, composite added to gallery")
    except Exception as e:
        logger.error(f"[Session] Finalize failed for {session.id}: {e}", exc_info=True)


@router.post("/create", response_model=CreateSessionResponse, status_code=status.HTTP_201_CREATED)
def create_session(req: CreateSessionRequest, db: Session = Depends(get_db)):
    """Create a new shared session and return invite link."""
    max_participants = LAYOUT_SLOTS.get(req.layout, 1)
    if max_participants <= 1:
        raise HTTPException(status_code=400, detail="Single layout does not support shared sessions")

    session = PhotoSession(
        id=str(uuid.uuid4()),
        layout=req.layout,
        max_participants=max_participants,
        frame_type=req.frame_type,
        filter_name=req.filter_name,
        status="waiting",
        created_at=_utcnow(),
    )
    db.add(session)
    db.commit()
    db.refresh(session)

    invite_link = f"{settings.SITE_URL}/session/{session.invite_token}"
    logger.info(f"[Session] Created session {session.id} with {max_participants} slots")

    return CreateSessionResponse(
        session_id=session.id,
        invite_token=session.invite_token,
        invite_link=invite_link,
        expires_at=session.expires_at,
        max_participants=max_participants,
        layout=session.layout,
    )


@router.get("/{token}", response_model=SessionInfoResponse)
def get_session_info(token: str, db: Session = Depends(get_db)):
    """Get session info including participants and status."""
    session = db.query(PhotoSession).filter(PhotoSession.invite_token == token).first()
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")

    # Auto-expire if past expiry
    if session.status == "waiting" and _is_expired(session):
        session.status = "expired"
        db.commit()
        _finalize_session(session, db)

    participants = _get_participants(session)

    return SessionInfoResponse(
        session_id=session.id,
        invite_token=session.invite_token,
        layout=session.layout,
        frame_type=session.frame_type or "simple",
        filter_name=session.filter_name or "normal",
        max_participants=session.max_participants,
        participant_count=len(participants),
        expires_at=session.expires_at,
        status=session.status,
        composite_url=f"/uploads/{session.composite_filename}" if session.composite_filename else None,
        participants=[_participant_dict_to_info(p) for p in participants],
    )


def _participant_dict_to_info(p: dict) -> ParticipantInfo:
    return ParticipantInfo(
        slot=p["slot"],
        image_url=f"/uploads/{p['filename']}",
        thumbnail_url=f"/uploads/{p['thumb_filename']}",
        created_at=_utcnow(),
    )


@router.post("/{token}/capture", response_model=SessionInfoResponse, status_code=status.HTTP_201_CREATED)
def capture_to_session(token: str, req: JoinSessionRequest, db: Session = Depends(get_db)):
    """Capture a photo and add it to the shared session as the next participant."""
    session = db.query(PhotoSession).filter(PhotoSession.invite_token == token).first()
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")

    if session.status != "waiting":
        raise HTTPException(status_code=400, detail=f"Session is {session.status}")

    if _is_expired(session):
        session.status = "expired"
        db.commit()
        _finalize_session(session, db)
        raise HTTPException(status_code=400, detail="Session has expired")

    current = _get_participants(session)
    if len(current) >= session.max_participants:
        raise HTTPException(status_code=400, detail="Session is full")

    next_slot = len(current)

    try:
        result = _save_participant_image(req.image_data, session.filter_name or "normal")
    except Exception as e:
        logger.error(f"[Session] Capture failed: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Image processing failed: {str(e)}")

    # Must copy list so SQLAlchemy detects the mutation
    participants = list(current)
    participants.append({
        "slot": next_slot,
        "filename": result["filename"],
        "thumb_filename": result["thumb_filename"],
    })
    session.participants_data = participants
    db.commit()
    logger.info(f"[Session] Participant {next_slot + 1}/{session.max_participants} added to session {session.id}")

    # Check if session is now full → auto-finalize
    if len(participants) >= session.max_participants:
        _finalize_session(session, db)

    db.refresh(session)
    final_participants = _get_participants(session)
    return SessionInfoResponse(
        session_id=session.id,
        invite_token=session.invite_token,
        layout=session.layout,
        frame_type=session.frame_type or "simple",
        filter_name=session.filter_name or "normal",
        max_participants=session.max_participants,
        participant_count=len(final_participants),
        expires_at=session.expires_at,
        status=session.status,
        composite_url=f"/uploads/{session.composite_filename}" if session.composite_filename else None,
        participants=[_participant_dict_to_info(p) for p in final_participants],
    )


@router.post("/{token}/finalize", response_model=SessionInfoResponse)
def finalize_session(token: str, db: Session = Depends(get_db)):
    """Manually finalize a session, generating the composite."""
    session = db.query(PhotoSession).filter(PhotoSession.invite_token == token).first()
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")

    if session.status != "waiting":
        raise HTTPException(status_code=400, detail=f"Session is already {session.status}")

    _finalize_session(session, db)

    participants = _get_participants(session)
    return SessionInfoResponse(
        session_id=session.id,
        invite_token=session.invite_token,
        layout=session.layout,
        frame_type=session.frame_type or "simple",
        filter_name=session.filter_name or "normal",
        max_participants=session.max_participants,
        participant_count=len(participants),
        expires_at=session.expires_at,
        status=session.status,
        composite_url=f"/uploads/{session.composite_filename}" if session.composite_filename else None,
        participants=[_participant_dict_to_info(p) for p in participants],
    )
