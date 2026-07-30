import os
import io
import base64
import zipfile
import logging
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query, status
from fastapi.responses import StreamingResponse, FileResponse
from sqlalchemy.orm import Session
from sqlalchemy import desc

from app.database import get_db
from app.models import CapturedImage, PhotoSession

logger = logging.getLogger("snapbooth.gallery")
from app.schemas import ImageResponse, GalleryResponse, ImageUpdateRequest, ExportRequest
from app.config import settings
from app.utils.helpers import delete_file
from app.services.image_processor import export_images_to_pdf
from app.services.qr_service import generate_qr_code

router = APIRouter(prefix="/api/gallery", tags=["gallery"])


def _image_to_response(img: CapturedImage) -> ImageResponse:
    base_url = "/uploads"
    return ImageResponse(
        id=img.id,
        session_id=img.session_id,
        filename=img.filename,
        thumbnail_url=f"{base_url}/{img.thumbnail_filename}",
        image_url=f"{base_url}/{img.filename}",
        filter_applied=img.filter_applied,
        is_favourite=img.is_favourite,
        layout=img.layout,
        custom_text=img.custom_text,
        stickers_data=img.stickers_data,
        width=img.width,
        height=img.height,
        file_size=img.file_size,
        created_at=img.created_at,
    )


@router.get("/", response_model=GalleryResponse)
def list_images(
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    search: Optional[str] = None,
    sort: str = "newest",
    favourites_only: bool = False,
    db: Session = Depends(get_db),
):
    """List captured images with pagination, search, sorting, and favourite filtering."""
    query = db.query(CapturedImage).filter(CapturedImage.is_archived == False)

    if search:
        query = query.filter(CapturedImage.custom_text.ilike(f"%{search}%"))
    if favourites_only:
        query = query.filter(CapturedImage.is_favourite == True)

    if sort == "oldest":
        query = query.order_by(CapturedImage.created_at.asc())
    elif sort == "newest":
        query = query.order_by(CapturedImage.created_at.desc())
    elif sort == "size":
        query = query.order_by(desc(CapturedImage.file_size))
    else:
        query = query.order_by(CapturedImage.created_at.desc())

    total = query.count()
    images = query.offset((page - 1) * page_size).limit(page_size).all()

    return GalleryResponse(
        images=[_image_to_response(img) for img in images],
        total=total,
        page=page,
        page_size=page_size,
    )


@router.get("/{image_id}", response_model=ImageResponse)
def get_image(image_id: str, db: Session = Depends(get_db)):
    """Get metadata for a single image."""
    img = db.query(CapturedImage).filter(CapturedImage.id == image_id).first()
    if not img:
        raise HTTPException(status_code=404, detail="Image not found")
    return _image_to_response(img)


@router.patch("/{image_id}", response_model=ImageResponse)
def update_image(image_id: str, req: ImageUpdateRequest, db: Session = Depends(get_db)):
    """Update image metadata (favourite, custom text, filter)."""
    img = db.query(CapturedImage).filter(CapturedImage.id == image_id).first()
    if not img:
        raise HTTPException(status_code=404, detail="Image not found")

    if req.is_favourite is not None:
        img.is_favourite = req.is_favourite
    if req.custom_text is not None:
        img.custom_text = req.custom_text
    if req.filter_applied is not None:
        img.filter_applied = req.filter_applied

    db.commit()
    db.refresh(img)
    return _image_to_response(img)


@router.delete("/{image_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_image(image_id: str, db: Session = Depends(get_db)):
    """Delete an image and its files from disk."""
    img = db.query(CapturedImage).filter(CapturedImage.id == image_id).first()
    if not img:
        raise HTTPException(status_code=404, detail="Image not found")

    # Remove physical files
    delete_file(os.path.join(settings.UPLOAD_DIR, img.filename))
    if img.thumbnail_filename:
        delete_file(os.path.join(settings.UPLOAD_DIR, img.thumbnail_filename))
    if img.original_filename:
        delete_file(os.path.join(settings.UPLOAD_DIR, img.original_filename))

    db.delete(img)
    db.commit()


@router.post("/export")
def export_images(req: ExportRequest, db: Session = Depends(get_db)):
    """Export selected images in the requested format (png, jpeg, pdf, zip)."""
    images = db.query(CapturedImage).filter(CapturedImage.id.in_(req.image_ids)).all()
    if not images:
        raise HTTPException(status_code=404, detail="No images found")

    file_paths = [os.path.join(settings.UPLOAD_DIR, img.filename) for img in images]

    if req.format == "pdf":
        output_path = os.path.join(settings.UPLOAD_DIR, f"export_{os.urandom(4).hex()}.pdf")
        export_images_to_pdf(file_paths, output_path)
        return FileResponse(output_path, media_type="application/pdf", filename="snapbooth_export.pdf")

    if req.format in ("png", "jpeg"):
        ext = req.format
        if len(file_paths) == 1:
            return FileResponse(file_paths[0], media_type=f"image/{ext}", filename=f"snapbooth.{ext}")
        # Multiple files -> return a ZIP
        buf = io.BytesIO()
        with zipfile.ZipFile(buf, "w", zipfile.ZIP_DEFLATED) as zf:
            for i, fp in enumerate(file_paths):
                arcname = f"snapbooth_{i + 1}.{ext}"
                zf.write(fp, arcname)
        buf.seek(0)
        return StreamingResponse(buf, media_type="application/zip", headers={"Content-Disposition": "attachment; filename=snapbooth_export.zip"})

    raise HTTPException(status_code=400, detail=f"Unsupported format: {req.format}")


@router.get("/{image_id}/download")
def download_image(image_id: str, fmt: str = Query("jpg"), db: Session = Depends(get_db)):
    """Download a single image in the specified format."""
    img = db.query(CapturedImage).filter(CapturedImage.id == image_id).first()
    if not img:
        raise HTTPException(status_code=404, detail="Image not found")

    filepath = os.path.join(settings.UPLOAD_DIR, img.filename)
    if not os.path.exists(filepath):
        raise HTTPException(status_code=404, detail="File not found on disk")

    media_types = {"jpg": "image/jpeg", "jpeg": "image/jpeg", "png": "image/png"}
    return FileResponse(filepath, media_type=media_types.get(fmt, "image/jpeg"), filename=f"snapbooth_{img.id[:8]}.{fmt}")


@router.get("/{image_id}/qr")
def get_sharing_qr(image_id: str, db: Session = Depends(get_db)):
    """Generate a QR code that links to the image for sharing."""
    img = db.query(CapturedImage).filter(CapturedImage.id == image_id).first()
    if not img:
        raise HTTPException(status_code=404, detail="Image not found")

    share_url = f"/gallery/{img.id}"
    qr_data_uri = generate_qr_code(share_url)
    return {"qr_code": qr_data_uri, "share_url": share_url}


@router.get("/sessions/{session_id}/share")
def get_session_share(session_id: str, db: Session = Depends(get_db)):
    """Generate share info (URL + QR code) for a photo session."""
    session = db.query(PhotoSession).filter(PhotoSession.id == session_id).first()
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")
    share_url = f"/share/{session_id}"
    qr_data_uri = generate_qr_code(share_url)
    return {"share_url": share_url, "qr_code": qr_data_uri, "session_id": session_id}
