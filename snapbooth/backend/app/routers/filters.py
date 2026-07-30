from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import Optional
import base64
import io
from PIL import Image

from app.services.image_processor import apply_filter

router = APIRouter(prefix="/api/filters", tags=["filters"])


class FilterPreviewRequest(BaseModel):
    image_data: str
    filter: str


class FilterPreviewResponse(BaseModel):
    preview_data: str
    filter: str


# Define available filters with metadata
FILTERS_CATALOG = [
    {"id": "normal", "name": "Normal", "description": "No filter applied"},
    {"id": "grayscale", "name": "Grayscale", "description": "Classic black and white"},
    {"id": "sepia", "name": "Sepia", "description": "Warm vintage brown tones"},
    {"id": "vintage", "name": "Vintage", "description": "Aged film look with subtle noise"},
    {"id": "warm", "name": "Warm", "description": "Golden hour warmth"},
    {"id": "cool", "name": "Cool", "description": "Cool blue tones"},
    {"id": "brightness", "name": "Bright", "description": "Increased brightness"},
    {"id": "contrast", "name": "Contrast", "description": "Enhanced contrast"},
    {"id": "saturation", "name": "Saturation", "description": "Vibrant colours"},
    {"id": "noir", "name": "Noir", "description": "High-contrast dramatic black & white"},
    {"id": "fade", "name": "Fade", "description": "Soft faded film aesthetic"},
    {"id": "dreamy", "name": "Dreamy", "description": "Soft glow with pastel tones"},
    {"id": "dramatic", "name": "Dramatic", "description": "Bold contrast with vignette"},
    {"id": "neon", "name": "Neon", "description": "Electric vibrant colours"},
]


@router.get("/", response_model=list)
def list_filters():
    """Return the list of available image filters."""
    return FILTERS_CATALOG


@router.post("/preview", response_model=FilterPreviewResponse)
def preview_filter(req: FilterPreviewRequest):
    """Apply a filter to a base64 image and return the preview."""
    try:
        if "," in req.image_data:
            raw = req.image_data.split(",", 1)[1]
        else:
            raw = req.image_data
        img_bytes = base64.b64decode(raw)
        pil_img = Image.open(io.BytesIO(img_bytes)).convert("RGB")

        result = apply_filter(pil_img, req.filter)

        buf = io.BytesIO()
        result.save(buf, "JPEG", quality=85)
        encoded = base64.b64encode(buf.getvalue()).decode("utf-8")
        return FilterPreviewResponse(preview_data=f"data:image/jpeg;base64,{encoded}", filter=req.filter)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Filter preview failed: {str(e)}")
