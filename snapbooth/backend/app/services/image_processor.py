import os
import io
import base64
import uuid
import math
import logging
import random
from typing import Optional, List, Tuple

import numpy as np
from PIL import Image, ImageEnhance, ImageFilter as PILFilter, ImageDraw, ImageFont, ImageOps

from app.config import settings
from app.services.sticker_service import apply_stickers_to_image

logger = logging.getLogger("snapbooth.image_processor")


def _decode_base64_to_pil(data_uri: str) -> Image.Image:
    if "," in data_uri:
        data_uri = data_uri.split(",", 1)[1]
    img_bytes = base64.b64decode(data_uri)
    return Image.open(io.BytesIO(img_bytes)).convert("RGB")


# ─── Creative Filters (all Pillow-based) ─────────────────────────────


def _apply_vignette(pil_img: Image.Image, strength: float = 0.4) -> Image.Image:
    w, h = pil_img.size
    x_c, y_c = w / 2, h / 2
    max_dist = math.sqrt(x_c ** 2 + y_c ** 2)
    vignette = Image.new("L", (w, h), 255)
    for y in range(h):
        for x in range(w):
            dist = math.sqrt((x - x_c) ** 2 + (y - y_c) ** 2) / max_dist
            val = int(255 * (1 - dist * strength))
            vignette.putpixel((x, y), max(0, val))
    result = Image.new("RGBA", (w, h))
    result.paste(pil_img, (0, 0))
    result.putalpha(vignette)
    bg = Image.new("RGBA", (w, h), (0, 0, 0, 255))
    bg.paste(result, (0, 0), result)
    return bg.convert("RGBA")


def _sepia_tone(pil_img: Image.Image) -> Image.Image:
    arr = np.array(pil_img, dtype=np.float32)
    r, g, b = arr[:, :, 0], arr[:, :, 1], arr[:, :, 2]
    out_r = np.clip(r * 0.393 + g * 0.769 + b * 0.189, 0, 255)
    out_g = np.clip(r * 0.349 + g * 0.686 + b * 0.168, 0, 255)
    out_b = np.clip(r * 0.272 + g * 0.534 + b * 0.131, 0, 255)
    result = np.stack([out_r, out_g, out_b], axis=2).astype(np.uint8)
    return Image.fromarray(result)


def _add_noise(pil_img: Image.Image, intensity: int = 20) -> Image.Image:
    arr = np.array(pil_img, dtype=np.int16)
    noise = np.random.randint(-intensity, intensity, arr.shape, dtype=np.int16)
    arr = np.clip(arr + noise, 0, 255).astype(np.uint8)
    return Image.fromarray(arr)


def apply_filter(pil_img: Image.Image, filter_name: str) -> Image.Image:
    if filter_name == "normal":
        return pil_img

    if filter_name == "grayscale":
        return ImageOps.grayscale(pil_img).convert("RGB")

    if filter_name == "sepia":
        return _sepia_tone(pil_img)

    if filter_name == "vintage":
        img = ImageEnhance.Color(pil_img).enhance(0.4)
        img = ImageEnhance.Contrast(img).enhance(0.8)
        img = _sepia_tone(img)
        return _add_noise(img, 20)

    if filter_name == "warm":
        arr = np.array(pil_img, dtype=np.float32)
        arr[:, :, 0] *= 0.85
        arr[:, :, 2] *= 1.25
        return Image.fromarray(np.clip(arr, 0, 255).astype(np.uint8))

    if filter_name == "cool":
        arr = np.array(pil_img, dtype=np.float32)
        arr[:, :, 0] *= 1.25
        arr[:, :, 2] *= 0.85
        return Image.fromarray(np.clip(arr, 0, 255).astype(np.uint8))

    if filter_name == "brightness":
        return ImageEnhance.Brightness(pil_img).enhance(1.3)

    if filter_name == "contrast":
        return ImageEnhance.Contrast(pil_img).enhance(1.6)

    if filter_name == "saturation":
        return ImageEnhance.Color(pil_img).enhance(1.6)

    if filter_name == "noir":
        gray = ImageOps.grayscale(pil_img)
        equalized = ImageOps.equalize(gray)
        return ImageEnhance.Contrast(equalized.convert("RGB")).enhance(1.4)

    if filter_name == "fade":
        img = ImageEnhance.Color(pil_img).enhance(0.5)
        img = ImageEnhance.Contrast(img).enhance(0.85)
        img = ImageEnhance.Brightness(img).enhance(1.08)
        arr = np.array(img, dtype=np.float32)
        white = np.full_like(arr, 220, dtype=np.float32)
        blended = arr * 0.85 + white * 0.15
        return Image.fromarray(np.clip(blended, 0, 255).astype(np.uint8))

    if filter_name == "dreamy":
        img = pil_img.filter(PILFilter.GaussianBlur(radius=2))
        img = ImageEnhance.Brightness(img).enhance(1.15)
        img = ImageEnhance.Color(img).enhance(0.7)
        return img.filter(PILFilter.UnsharpMask(radius=1, percent=50, threshold=0))

    if filter_name == "dramatic":
        img = ImageEnhance.Contrast(pil_img).enhance(1.8)
        img = ImageEnhance.Color(img).enhance(1.3)
        img = _apply_vignette(img.convert("RGBA"), strength=0.6)
        return img.convert("RGB")

    if filter_name == "neon":
        img = ImageEnhance.Color(pil_img).enhance(2.0)
        img = ImageEnhance.Contrast(img).enhance(1.2)
        return img

    return pil_img


# ─── Frame / Border Effects ─────────────────────────────────────────


def apply_frame_effect(pil_img: Image.Image, frame_type: str) -> Image.Image:
    if frame_type == "none":
        return pil_img

    if frame_type == "simple":
        border_size = max(8, pil_img.width // 40)
        result = Image.new("RGBA", (pil_img.width + border_size * 2, pil_img.height + border_size * 2), (255, 255, 255, 255))
        result.paste(pil_img, (border_size, border_size))
        draw = ImageDraw.Draw(result)
        draw.rectangle([0, 0, result.width - 1, result.height - 1], outline="#d0d0d0", width=max(1, border_size // 4))
        return result

    if frame_type == "instax":
        ratio = 0.12
        bw = int(pil_img.width * ratio)
        bh = int(pil_img.height * ratio * 1.8)
        result = Image.new("RGBA", (pil_img.width + bw * 2, pil_img.height + bh + bw), (255, 255, 255, 255))
        result.paste(pil_img, (bw, bw))
        draw = ImageDraw.Draw(result)
        draw.rectangle([bw - 2, bw - 2, pil_img.width + bw + 1, pil_img.height + bw + 1], outline="#e8e8e8", width=2)
        return result

    if frame_type == "polaroid":
        bw = int(pil_img.width * 0.08)
        bh = int(pil_img.height * 0.45)
        result = Image.new("RGBA", (pil_img.width + bw * 2, pil_img.height + bh + bw), (245, 245, 240, 255))
        result.paste(pil_img, (bw, bw))
        shadow = Image.new("RGBA", (pil_img.width + bw * 2 + 4, pil_img.height + bh + bw + 4), (0, 0, 0, 30))
        shadow.paste(result, (2, 2))
        shadow.paste(result, (0, 0))
        return result

    if frame_type == "film":
        bw = int(pil_img.width * 0.06)
        bh = int(pil_img.height * 0.25)
        result = Image.new("RGBA", (pil_img.width + bw * 2, pil_img.height + bh + bw), (20, 20, 20, 255))
        result.paste(pil_img, (bw, bw))
        draw = ImageDraw.Draw(result)
        sprocket_h = bh // 4
        for y in range(0, result.height, sprocket_h * 2):
            for x in range(8, result.width - 8, 20):
                draw.rectangle([x, y, x + 6, y + sprocket_h - 2], fill=(40, 40, 40))
        return result

    return pil_img


# ─── Thumbnail ──────────────────────────────────────────────────────


def create_thumbnail(pil_img: Image.Image, max_size: int = 300) -> Image.Image:
    w, h = pil_img.size
    size = min(w, h)
    left = (w - size) // 2
    top = (h - size) // 2
    cropped = pil_img.crop((left, top, left + size, top + size))
    cropped.thumbnail((max_size, max_size), Image.LANCZOS)
    return cropped


# ─── Main Processing Pipeline ────────────────────────────────────────


def process_and_save(
    image_data: str,
    filter_name: str = "normal",
    custom_text: Optional[str] = None,
    stickers_data: Optional[List[dict]] = None,
    frame_type: str = "simple",
) -> Tuple[str, str, str, int, int, int]:
    logger.info("[Processing] Starting image processing pipeline")
    pil_img = _decode_base64_to_pil(image_data)
    logger.info(f"[Processing] Base64 image decoded: {pil_img.size}")

    # Apply the selected filter
    pil_img = apply_filter(pil_img, filter_name)
    logger.info(f"[Processing] Filter '{filter_name}' applied")

    pil_img = pil_img.convert("RGBA")

    # Resize if exceeding max dimension
    max_dim = settings.MAX_IMAGE_SIZE
    if max(pil_img.width, pil_img.height) > max_dim:
        ratio = max_dim / max(pil_img.width, pil_img.height)
        new_w, new_h = int(pil_img.width * ratio), int(pil_img.height * ratio)
        pil_img = pil_img.resize((new_w, new_h), Image.LANCZOS)
        logger.info(f"[Processing] Resized to {new_w}x{new_h}")

    # Apply frame/border effect
    pil_img = apply_frame_effect(pil_img, frame_type)
    logger.info(f"[Processing] Frame '{frame_type}' applied")

    # Apply text overlay
    if custom_text:
        draw = ImageDraw.Draw(pil_img)
        try:
            font = ImageFont.truetype("arial.ttf", 36)
        except (IOError, OSError):
            font = ImageFont.load_default()
        bbox = draw.textbbox((0, 0), custom_text, font=font)
        tw, th = bbox[2] - bbox[0], bbox[3] - bbox[1]
        tx, ty = 20, pil_img.height - th - 20
        draw.text((tx + 1, ty + 1), custom_text, font=font, fill=(0, 0, 0, 180))
        draw.text((tx, ty), custom_text, font=font, fill=(255, 255, 255, 255))
        logger.info(f"[Processing] Text overlay applied: '{custom_text}'")

    # Apply stickers
    if stickers_data:
        pil_img = apply_stickers_to_image(pil_img, stickers_data)
        logger.info(f"[Processing] {len(stickers_data)} stickers applied")

    pil_rgb = pil_img.convert("RGB")

    # Save full-size image
    file_id = uuid.uuid4().hex
    filename = f"{file_id}.jpg"
    filepath = os.path.join(settings.UPLOAD_DIR, filename)
    pil_rgb.save(filepath, "JPEG", quality=settings.JPEG_QUALITY)
    file_size = os.path.getsize(filepath)
    logger.info(f"[Storage] Saved image: {filepath} ({pil_rgb.width}x{pil_rgb.height}, {file_size} bytes)")

    # Create and save thumbnail
    thumb = create_thumbnail(pil_rgb)
    thumbnail_filename = f"{file_id}_thumb.jpg"
    thumb_path = os.path.join(settings.UPLOAD_DIR, thumbnail_filename)
    thumb.save(thumb_path, "JPEG", quality=80)
    logger.info(f"[Storage] Saved thumbnail: {thumb_path}")

    logger.info(f"[Processing] Image processing completed: {filename}")
    return filename, thumbnail_filename, "", pil_rgb.width, pil_rgb.height, file_size


def process_and_save_composite(
    images_data: List[str],
    layout: str = "single",
    filter_name: str = "normal",
    frame_type: str = "simple",
) -> Tuple[str, str, str, int, int, int]:
    """Decode multiple images, apply filter, create layout composite, apply frame, save."""
    logger.info(f"[Processing] Starting composite pipeline: {len(images_data)} images, layout={layout}")

    pil_images = []
    for i, data in enumerate(images_data):
        pil = _decode_base64_to_pil(data)
        pil = apply_filter(pil, filter_name)
        pil_images.append(pil)
        logger.info(f"[Processing] Image {i+1} decoded and filtered")

    # Create layout composite
    composite = create_layout_image(pil_images, layout)
    logger.info(f"[Processing] Layout composite created: {composite.size}")

    # Apply frame
    composite = apply_frame_effect(composite.convert("RGBA"), frame_type)
    composite_rgb = composite.convert("RGB")

    # Save
    file_id = uuid.uuid4().hex
    filename = f"{file_id}.jpg"
    filepath = os.path.join(settings.UPLOAD_DIR, filename)
    composite_rgb.save(filepath, "JPEG", quality=settings.JPEG_QUALITY)
    file_size = os.path.getsize(filepath)

    thumb = create_thumbnail(composite_rgb)
    thumbnail_filename = f"{file_id}_thumb.jpg"
    thumb_path = os.path.join(settings.UPLOAD_DIR, thumbnail_filename)
    thumb.save(thumb_path, "JPEG", quality=80)

    logger.info(f"[Storage] Saved composite: {filename} ({composite_rgb.width}x{composite_rgb.height}, {file_size}B)")
    return filename, thumbnail_filename, "", composite_rgb.width, composite_rgb.height, file_size


# ─── Layouts ──────────────────────────────────────────────────────────


def create_layout_image(images: List[Image.Image], layout: str) -> Image.Image:
    if not images:
        return Image.new("RGB", (100, 100), (0, 0, 0))

    if layout == "single" or len(images) == 1:
        return images[0].convert("RGB")

    # Cell aspect ratio matching frontend's aspect-[1386/1266]
    cell_w = 600
    cell_h = int(cell_w * 1266 / 1386)  # ≈ 548
    gap = 8

    if layout == "strip":
        out_imgs = []
        for img in images:
            r = img.resize((cell_w, int(cell_w * img.height / img.width)), Image.LANCZOS)
            out_imgs.append(r)
        out_h = sum(im.height for im in out_imgs) + gap * (len(out_imgs) - 1)
        canvas = Image.new("RGB", (cell_w, out_h), (255, 255, 255))
        y = 0
        for im in out_imgs:
            canvas.paste(im, (0, y))
            y += im.height + gap
        return canvas

    if layout == "2x2":
        out_w = cell_w * 2 + gap
        out_h = cell_h * 2 + gap
        canvas = Image.new("RGB", (out_w, out_h), (255, 255, 255))
        for i in range(min(4, len(images))):
            r = images[i].resize((cell_w, cell_h), Image.LANCZOS)
            x = (i % 2) * (cell_w + gap)
            y = (i // 2) * (cell_h + gap)
            canvas.paste(r, (x, y))
        return canvas

    if layout == "2x1_side":
        left_w = cell_w
        left_h = cell_h
        right_w = int(left_w * 1.5)  # matches frontend 1fr:1.5fr
        right_h = int(right_w * 1266 / 1386)  # same aspect ratio as left cells
        out_w = left_w + gap + right_w
        out_h = left_h * 2 + gap
        canvas = Image.new("RGB", (out_w, out_h), (255, 255, 255))
        for i in range(min(2, len(images))):
            r = images[i].resize((left_w, left_h), Image.LANCZOS)
            canvas.paste(r, (0, i * (left_h + gap)))
        src = images[2] if len(images) > 2 else images[-1]
        r = src.resize((right_w, right_h), Image.LANCZOS)
        y_off = (out_h - right_h) // 2
        canvas.paste(r, (left_w + gap, y_off))
        return canvas

    return images[0].convert("RGB")


def create_session_composite(image_paths: List[str], layout: str, frame_type: str, output_path: str, upload_dir: str) -> str:
    images = []
    for path in image_paths:
        full_path = os.path.join(upload_dir, path) if not os.path.isabs(path) else path
        if os.path.exists(full_path):
            try:
                img = Image.open(full_path).convert("RGB")
                images.append(img)
            except Exception as e:
                logger.warning(f"[Composite] Failed to open {full_path}: {e}")

    if not images:
        raise ValueError("No valid images found for composite")

    layout_map = {"2x1_side": "2x1_side", "2x2": "2x2", "strip": "strip", "single": "single"}
    composite = create_layout_image(images, layout_map.get(layout, "single"))

    composite = apply_frame_effect(composite.convert("RGBA"), frame_type)
    composite.convert("RGB").save(output_path, "JPEG", quality=settings.JPEG_QUALITY)
    logger.info(f"[Composite] Saved composite: {output_path}")
    return output_path


def export_images_to_pdf(image_paths: List[str], output_path: str) -> str:
    images = []
    for path in image_paths:
        full_path = os.path.join(settings.UPLOAD_DIR, path) if not os.path.isabs(path) else path
        if os.path.exists(full_path):
            img = Image.open(full_path).convert("RGB")
            images.append(img)

    if not images:
        raise ValueError("No valid images found for PDF export")

    images[0].save(output_path, save_all=True, append_images=images[1:])
    return output_path
