import os
import uuid
from typing import Optional
from fastapi import Header, UploadFile


def get_anonymous_id(
    x_anonymous_id: Optional[str] = Header(None, alias="X-Anonymous-ID"),
) -> Optional[str]:
    """Extract the persistent anonymous device ID sent by the frontend."""
    if not x_anonymous_id or len(x_anonymous_id) > 128:
        return None
    return x_anonymous_id


def save_upload_file(upload_dir: str, file: UploadFile, subdir: str = "") -> str:
    """Save an uploaded file to disk and return the relative path."""
    target_dir = os.path.join(upload_dir, subdir)
    os.makedirs(target_dir, exist_ok=True)
    ext = os.path.splitext(file.filename or "image.jpg")[1] or ".jpg"
    filename = f"{uuid.uuid4().hex}{ext}"
    filepath = os.path.join(target_dir, filename)
    with open(filepath, "wb") as f:
        f.write(file.file.read())
    return os.path.join(subdir, filename).replace("\\", "/")


def delete_file(filepath: str) -> None:
    """Safely delete a file if it exists."""
    try:
        if os.path.exists(filepath):
            os.remove(filepath)
    except OSError:
        pass
