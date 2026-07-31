from pydantic import BaseModel, Field
from typing import Optional, Any, List
from datetime import datetime


class CaptureRequest(BaseModel):
    """Schema for a photo capture request sent from the frontend."""
    image_data: str = Field(..., description="Base64-encoded JPEG image data")
    filter: str = Field("normal", description="Filter name to apply")
    layout: str = Field("single", description="Layout type: single, strip, 2x2, 3x3")
    layout_position: int = Field(0, description="Position index within the layout grid")
    session_id: Optional[str] = Field(None, description="Existing session ID for multi-capture layouts")
    custom_text: Optional[str] = Field(None, description="Optional text overlay")
    stickers_data: Optional[List[dict]] = Field(None, description="Array of sticker placements")
    frame_type: str = Field("simple", description="Frame/border type: none, simple, instax, polaroid, film")


class CaptureResponse(BaseModel):
    """Response returned after a successful capture."""
    id: str
    session_id: str
    filename: str
    thumbnail_url: str
    image_url: str
    filter_applied: str
    created_at: datetime


class ImageUpdateRequest(BaseModel):
    """Schema for updating image metadata (favourite, text, etc.)."""
    is_favourite: Optional[bool] = None
    custom_text: Optional[str] = None
    filter_applied: Optional[str] = None


class ImageResponse(BaseModel):
    """Full metadata response for a captured image."""
    id: str
    session_id: str
    filename: str
    thumbnail_url: str
    image_url: str
    filter_applied: str
    is_favourite: bool
    layout: Optional[str] = None
    custom_text: Optional[str] = None
    stickers_data: Optional[Any] = None
    width: Optional[int] = None
    height: Optional[int] = None
    file_size: Optional[int] = None
    owner_ids: Optional[List[str]] = None
    created_at: datetime

    class Config:
        from_attributes = True


class GalleryResponse(BaseModel):
    """Paginated gallery response."""
    images: List[ImageResponse]
    total: int
    page: int
    page_size: int


class CompositeCaptureRequest(BaseModel):
    """Schema for capturing multiple images as a single layout composite."""
    images: List[str] = Field(..., min_length=1, description="Array of base64-encoded JPEG image data")
    filter: str = Field("normal", description="Filter name to apply to each image")
    layout: str = Field("single", description="Layout type: single, strip, 2x2, 2x1_side")
    frame_type: str = Field("simple", description="Frame/border type: none, simple, instax, polaroid, film")


class CompositeResponse(BaseModel):
    """Response for a generated session composite image."""
    session_id: str
    composite_url: str
    layout: str
    frame_type: str
    image_count: int


class CreateSessionRequest(BaseModel):
    """Schema for creating a new shared session."""
    layout: str = Field("single", description="Layout type: single, 2x1_side, strip, 2x2")
    frame_type: str = Field("simple", description="Frame/border type")
    filter_name: str = Field("normal", description="Filter name")


class CreateSessionResponse(BaseModel):
    """Response after creating a shared session."""
    session_id: str
    invite_token: str
    invite_link: str
    expires_at: datetime
    max_participants: int
    layout: str


class ParticipantInfo(BaseModel):
    """Info for a single participant in a shared session."""
    slot: int
    image_url: str
    thumbnail_url: str
    created_at: datetime


class SessionInfoResponse(BaseModel):
    """Full session info with participant list and status."""
    session_id: str
    invite_token: str
    layout: str
    frame_type: str
    filter_name: str
    max_participants: int
    participant_count: int
    expires_at: datetime
    status: str
    composite_url: Optional[str] = None
    participants: List[ParticipantInfo] = []


class JoinSessionRequest(BaseModel):
    """Schema for a participant joining and uploading their photo."""
    image_data: str = Field(..., description="Base64-encoded JPEG image data")


class ExportRequest(BaseModel):
    """Schema for export/download requests."""
    image_ids: List[str] = Field(..., min_length=1)
    format: str = Field("png", description="Export format: png, jpeg, pdf")
