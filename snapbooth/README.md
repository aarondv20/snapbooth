# SnapBooth

A modern web-based photobooth application.

## Tech Stack

- **Backend:** FastAPI, OpenCV, Pillow, SQLAlchemy, SQLite, Uvicorn
- **Frontend:** React 18, Vite, Tailwind CSS, React Router, Axios

## Project Structure

```
snapbooth/
├── backend/
│   ├── app/
│   │   ├── main.py            # FastAPI entry point
│   │   ├── config.py           # Environment configuration
│   │   ├── database.py         # SQLAlchemy setup
│   │   ├── models.py           # Database models
│   │   ├── schemas.py          # Pydantic schemas
│   │   ├── routers/            # API route handlers
│   │   │   ├── capture.py      # Photo capture endpoints
│   │   │   ├── gallery.py      # Gallery CRUD endpoints
│   │   │   └── filters.py      # Filter catalog & preview
│   │   ├── services/           # Business logic
│   │   │   ├── image_processor.py  # Image processing pipeline
│   │   │   ├── sticker_service.py  # Sticker overlay logic
│   │   │   └── qr_service.py       # QR code generation
│   │   └── utils/              # Utility functions
│   ├── uploads/                # Captured images directory
│   ├── .env                    # Environment variables
│   └── requirements.txt
├── frontend/
│   ├── src/
│   │   ├── components/         # React components
│   │   ├── hooks/              # Custom hooks
│   │   ├── pages/              # Page components
│   │   ├── services/           # API client
│   │   ├── types/              # TypeScript types
│   │   └── utils/              # Utility functions
│   ├── package.json
│   └── vite.config.ts
└── README.md
```

## Quick Start

### 1. Install dependencies

```bash
# Backend
cd backend
pip install -r requirements.txt

# Frontend
cd ../frontend
npm install
```

### 2. Start the backend

```powershell
cd backend
python -m uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
```

### 3. Start the frontend (in a separate terminal)

```powershell
cd frontend
npm run dev
```

### 4. Open the app

Visit http://localhost:5173

## Features

- Live camera preview with mirror mode
- Multiple layouts: single, strip, 2×2, 3×3
- Countdown timer (3s, 5s, 10s)
- Image filters: grayscale, sepia, vintage, warm, cool, brightness, contrast, saturation
- Decorative frames
- Draggable stickers (emoji-based)
- Custom text overlays
- Gallery with search, sort, favourites, preview, delete
- Export as PNG, JPEG, PDF
- QR code sharing
- Fully responsive design
