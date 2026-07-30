import io
import base64
import qrcode
from qrcode.image.pil import PilImage


def generate_qr_code(data: str) -> str:
    """Generate a QR code image from the given data string and return it as a base64 data URI."""
    qr = qrcode.QRCode(
        version=1,
        error_correction=qrcode.constants.ERROR_CORRECT_M,
        box_size=10,
        border=4,
    )
    qr.add_data(data)
    qr.make(fit=True)
    img = qr.make_image(fill_color="black", back_color="white")
    buffer = io.BytesIO()
    img.save(buffer, format="PNG")
    buffer.seek(0)
    data_uri = base64.b64encode(buffer.getvalue()).decode("utf-8")
    return f"data:image/png;base64,{data_uri}"
