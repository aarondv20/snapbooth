from PIL import Image, ImageDraw, ImageFont
import os
from typing import List, Optional


# Built-in sticker assets (emoji-based stickers rendered as images)
BUILTIN_STICKERS = [
    {"id": "star", "emoji": "⭐", "label": "Star"},
    {"id": "heart", "emoji": "❤️", "label": "Heart"},
    {"id": "fire", "emoji": "🔥", "label": "Fire"},
    {"id": "clown", "emoji": "🤡", "label": "Clown"},
    {"id": "party", "emoji": "🎉", "label": "Party"},
    {"id": "sunglasses", "emoji": "😎", "label": "Cool"},
    {"id": "crown", "emoji": "👑", "label": "Crown"},
    {"id": "unicorn", "emoji": "🦄", "label": "Unicorn"},
    {"id": "rainbow", "emoji": "🌈", "label": "Rainbow"},
    {"id": "thumbsup", "emoji": "👍", "label": "Thumbs Up"},
]


def apply_stickers_to_image(
    image: Image.Image,
    stickers: Optional[List[dict]],
    font_path: Optional[str] = None,
) -> Image.Image:
    """Overlay emoji stickers and custom text onto a PIL Image.

    Each sticker dict should have: {id, emoji, x, y, scale, rotation}
    """
    if not stickers:
        return image

    img = image.copy().convert("RGBA")
    overlay = Image.new("RGBA", img.size, (0, 0, 0, 0))
    draw = ImageDraw.Draw(overlay)

    try:
        font = ImageFont.truetype(font_path or "seguiemj.ttf", 48)
    except (IOError, OSError):
        font = ImageFont.load_default()

    for sticker in stickers:
        emoji = sticker.get("emoji", "⭐")
        x = sticker.get("x", 0)
        y = sticker.get("y", 0)
        scale = sticker.get("scale", 1.0)
        rotation = sticker.get("rotation", 0)

        font_size = max(12, int(48 * scale))
        try:
            s_font = ImageFont.truetype(font_path or "seguiemj.ttf", font_size)
        except (IOError, OSError):
            s_font = ImageFont.load_default()

        bbox = draw.textbbox((0, 0), emoji, font=s_font)
        tw, th = bbox[2] - bbox[0], bbox[3] - bbox[1]
        sticker_img = Image.new("RGBA", (tw + 20, th + 20), (0, 0, 0, 0))
        s_draw = ImageDraw.Draw(sticker_img)
        s_draw.text((10, 10), emoji, font=s_font, fill=(255, 255, 255, 255))

        if rotation != 0:
            sticker_img = sticker_img.rotate(rotation, expand=True, resample=Image.BICUBIC)

        overlay.paste(sticker_img, (int(x), int(y)), sticker_img)

    img = Image.alpha_composite(img, overlay)
    return img
