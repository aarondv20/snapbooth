import os
import uuid
import logging
from datetime import datetime, timezone
from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.database import get_db
from app.models import PhotoSession, CapturedImage

logger = logging.getLogger("snapbooth.capture")
from app.schemas import CaptureRequest, CaptureResponse, CompositeResponse, CompositeCaptureRequest
from app.services.image_processor import process_and_save, process_and_save_composite, create_session_composite, _decode_base64_to_pil
from app.config import settings
from app.utils.helpers import get_anonymous_id

router = APIRouter(prefix="/api/capture", tags=["capture"])


def _save_capture(req: CaptureRequest, db: Session, owner_id) -> CaptureResponse:
    """Internal capture logic shared by /capture/ and /capture/batch."""
    session_id = req.session_id
    logger.info(f"[Capture] Received capture request, session_id={session_id}, layout={req.layout}, filter={req.filter}")

    # Create or reuse a photo session
    if session_id:
        session = db.query(PhotoSession).filter(PhotoSession.id == session_id).first()
        if not session:
            logger.warning(f"[Capture] Session not found: {session_id}")
            raise HTTPException(status_code=404, detail="Session not found")
        logger.info(f"[Capture] Using existing session: {session_id}")
    else:
        session = PhotoSession(id=str(uuid.uuid4()), layout=req.layout, created_at=datetime.now(timezone.utc))
        db.add(session)
        db.flush()
        session_id = session.id
        logger.info(f"[Capture] Created new session: {session_id}")

    # Process and save the image
    try:
        filename, thumb_filename, orig_filename, width, height, file_size = process_and_save(
            image_data=req.image_data,
            filter_name=req.filter,
            custom_text=req.custom_text,
            stickers_data=req.stickers_data,
            frame_type=req.frame_type,
        )
        logger.info(f"[Storage] Saved image: {filename} ({width}x{height}, {file_size} bytes)")
    except Exception as e:
        logger.error(f"[Processing] Image processing failed: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Image processing failed: {str(e)}")

    # Create metadata record
    image = CapturedImage(
        id=str(uuid.uuid4()),
        session_id=session_id,
        filename=filename,
        thumbnail_filename=thumb_filename,
        original_filename=orig_filename,
        filter_applied=req.filter,
        layout_position=req.layout_position,
        width=width,
        height=height,
        file_size=file_size,
        custom_text=req.custom_text,
        stickers_data=req.stickers_data,
        owner_ids=[owner_id] if owner_id else [],
        created_at=datetime.now(timezone.utc),
    )
    db.add(image)
    db.commit()
    db.refresh(image)
    logger.info(f"[Database] Gallery record inserted: id={image.id}, filename={image.filename}")

    base_url = "/uploads"
    logger.info(f"[API] Returning success response for image {image.id}")
    return CaptureResponse(
        id=image.id,
        session_id=image.session_id,
        filename=image.filename,
        thumbnail_url=f"{base_url}/{image.thumbnail_filename}",
        image_url=f"{base_url}/{image.filename}",
        filter_applied=image.filter_applied,
        created_at=image.created_at,
    )


@router.post("/", response_model=CaptureResponse, status_code=status.HTTP_201_CREATED)
def capture_image(req: CaptureRequest, db: Session = Depends(get_db), owner_id: Optional[str] = Depends(get_anonymous_id)):
    """Capture a single photo: decode base64, apply filter, save to disk, store metadata."""
    return _save_capture(req, db, owner_id)


@router.post("/composite", response_model=CaptureResponse, status_code=status.HTTP_201_CREATED)
def capture_composite(req: CompositeCaptureRequest, db: Session = Depends(get_db), owner_id: Optional[str] = Depends(get_anonymous_id)):
    """Capture multiple images and save as a single layout composite."""
    logger.info(f"[Capture] Composite request: {len(req.images)} images, layout={req.layout}, filter={req.filter}")

    session = PhotoSession(id=str(uuid.uuid4()), layout=req.layout, created_at=datetime.now(timezone.utc))
    db.add(session)
    db.flush()
    session_id = session.id

    try:
        filename, thumb_filename, _, width, height, file_size = process_and_save_composite(
            images_data=req.images,
            layout=req.layout,
            filter_name=req.filter,
            frame_type=req.frame_type,
        )
    except Exception as e:
        logger.error(f"[Processing] Composite processing failed: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Image processing failed: {str(e)}")

    image = CapturedImage(
        id=str(uuid.uuid4()),
        session_id=session_id,
        filename=filename,
        thumbnail_filename=thumb_filename,
        filter_applied=req.filter,
        layout_position=0,
        width=width,
        height=height,
        file_size=file_size,
        layout=req.layout,
        owner_ids=[owner_id] if owner_id else [],
        created_at=datetime.now(timezone.utc),
    )
    db.add(image)
    db.commit()
    db.refresh(image)
    logger.info(f"[Database] Gallery record inserted: id={image.id}, filename={image.filename}")

    return CaptureResponse(
        id=image.id,
        session_id=image.session_id,
        filename=image.filename,
        thumbnail_url=f"/uploads/{image.thumbnail_filename}",
        image_url=f"/uploads/{image.filename}",
        filter_applied=image.filter_applied,
        created_at=image.created_at,
    )


@router.post("/batch", response_model=List[CaptureResponse], status_code=status.HTTP_201_CREATED)
def batch_capture(requests: List[CaptureRequest], db: Session = Depends(get_db), owner_id: Optional[str] = Depends(get_anonymous_id)):
    """Capture multiple images in a single batch (used for layout captures)."""
    responses = []
    for req in requests:
        resp = _save_capture(req, db, owner_id)
        responses.append(resp)
    return responses


@router.get("/sessions", response_model=List[dict])
def list_sessions(db: Session = Depends(get_db)):
    """Return all photo sessions with their image counts."""
    sessions = db.query(PhotoSession).order_by(PhotoSession.created_at.desc()).all()
    result = []
    for s in sessions:
        count = db.query(CapturedImage).filter(CapturedImage.session_id == s.id).count()
        result.append({
            "id": s.id,
            "layout": s.layout,
            "image_count": count,
            "created_at": s.created_at.isoformat() if s.created_at else None,
        })
    return result


@router.get("/sessions/{session_id}", response_model=dict)
def get_session(session_id: str, db: Session = Depends(get_db)):
    """Get a session with all its captured images."""
    session = db.query(PhotoSession).filter(PhotoSession.id == session_id).first()
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")
    images = db.query(CapturedImage).filter(CapturedImage.session_id == session_id).order_by(CapturedImage.layout_position).all()
    base_url = "/uploads"
    return {
        "id": session.id,
        "layout": session.layout,
        "label": session.label,
        "created_at": session.created_at.isoformat() if session.created_at else None,
        "images": [
            {
                "id": img.id,
                "image_url": f"{base_url}/{img.filename}",
                "thumbnail_url": f"{base_url}/{img.thumbnail_filename}",
                "filter_applied": img.filter_applied,
                "layout_position": img.layout_position,
            }
            for img in images
        ],
    }


@router.post("/sessions/{session_id}/composite", response_model=CompositeResponse)
def generate_session_composite(session_id: str, frame_type: str = "simple", db: Session = Depends(get_db)):
    """Generate a final composite image from all photos in a session, with layout + frame applied."""
    session = db.query(PhotoSession).filter(PhotoSession.id == session_id).first()
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")

    images = db.query(CapturedImage).filter(CapturedImage.session_id == session_id).order_by(CapturedImage.layout_position).all()
    if not images:
        raise HTTPException(status_code=400, detail="Session has no images")

    image_paths = [img.filename for img in images]
    composite_filename = f"composite_{session_id}.jpg"
    output_path = os.path.join(settings.UPLOAD_DIR, composite_filename)

    try:
        create_session_composite(image_paths, session.layout, frame_type, output_path, settings.UPLOAD_DIR)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Composite generation failed: {str(e)}")

    return CompositeResponse(
        session_id=session_id,
        composite_url=f"/uploads/{composite_filename}",
        layout=session.layout,
        frame_type=frame_type,
        image_count=len(image_paths),
    )
