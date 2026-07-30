# SnapBooth

A real-time collaborative web photobooth. Multiple people can join the same photo session from their own devices using a shared link, capture photos with filters, and view them in a shared gallery.

**Status:** Active development · v1.0.0

---

## Features

### Implemented

- **Live camera capture** — browser-based photo capture with countdown timer
- **Photo filters** — apply real-time CSS filters (grayscale, sepia, cool, warm, etc.) with server-side rendering for exports
- **Layouts** — single, 2×1 side-by-side, 2×2 grid, and 4×1 strip
- **Frames** — simple border, Instax, Polaroid, and film-border effects
- **Async shared sessions** — create a session, share the invite link, and let up to N participants add their photos from different devices
- **Auto-finalize** — when all slots are filled, the backend merges all photos into a single composite image
- **Invite links** — each session gets a unique URL; share it via text, email, or QR code
- **Live progress** — participants see slot-by-slot updates as others join (REST polling)
- **Gallery** — view, favourite, delete, and download all saved composites
- **Image preview modal** — full-size preview with download, favourite, delete, and QR share
- **Filter previews** — live thumbnails of each filter before capturing
- **PDF export** — export selected gallery images as a PDF
- **Standalone capture** — capture all layout slots yourself and save directly to the gallery (no session needed)

### Planned

- WebSocket-based real-time updates (replace REST polling)
- User authentication and session history
- Cloud storage (S3-compatible) for uploads
- Docker deployment
- AI background removal
- Session analytics dashboard
- Custom sticker uploads

---

## Architecture

```
┌─────────────┐     REST / JSON      ┌──────────────┐     SQL     ┌──────────┐
│   Frontend  │─────────────────────▶│   Backend    │────────────▶│  SQLite  │
│  React+Vite │◀─────────────────────│   FastAPI    │◀────────────│ (dev DB) │
│  Tailwind   │     JSON responses   │   Pillow     │             └──────────┘
│  TypeScript │                      │  SQLAlchemy  │
└─────────────┘                      └──────┬───────┘
       │                                     │
       │  Camera → Canvas → base64           │  Serves /uploads
       ▼                                     ▼
   Browser Webcam                    Local filesystem
```

### Key design decisions

- **Pillow-only image processing** — all filter and composite operations use Pillow. No OpenCV dependency.
- **REST-based collaboration** — shared sessions use REST polling (5s interval) rather than WebSockets. Simple, reliable, and easy to debug. WebSocket upgrade is planned.
- **SQLite in development** — keeps setup zero-config. Swaps to PostgreSQL for production by changing one environment variable.
- **Single-server deployment** — the built frontend is served as static files from the FastAPI backend. No separate host needed.

---

## Project structure

```
snapbooth/
├── backend/
│   ├── app/
│   │   ├── routers/           # API endpoints
│   │   │   ├── capture.py     # Photo capture & composite
│   │   │   ├── gallery.py     # Gallery CRUD
│   │   │   ├── filters.py     # Filter previews
│   │   │   └── session.py     # Shared session endpoints
│   │   ├── services/
│   │   │   └── image_processor.py  # Filters, layouts, frames, composites
│   │   ├── models.py          # SQLAlchemy models
│   │   ├── schemas.py         # Pydantic request/response schemas
│   │   ├── database.py        # DB engine & session factory
│   │   └── config.py          # Environment-based settings
│   ├── uploads/               # Captured images & composites
│   ├── requirements.txt
│   └── run.py                 # Entry point
├── frontend/
│   ├── src/
│   │   ├── components/        # Reusable UI components
│   │   │   ├── Camera/        # Camera preview, controls, countdown
│   │   │   ├── Gallery/       # Grid, preview modal
│   │   │   ├── Layout/        # Layout grid, frame selector
│   │   │   ├── Filters/       # Filter preview strip
│   │   │   ├── Stickers/      # Sticker & text overlay UI
│   │   │   ├── SharedSession/ # Invite modal
│   │   │   └── common/        # Button, Spinner, Toast, Modal, ImagePreview
│   │   ├── pages/
│   │   │   ├── CapturePage.tsx
│   │   │   ├── GalleryPage.tsx
│   │   │   └── SharedSessionPage.tsx
│   │   ├── hooks/             # useCamera, useCountdown
│   │   ├── services/          # API client (axios)
│   │   ├── utils/             # CSS filter definitions
│   │   └── types/             # TypeScript type definitions
│   ├── package.json
│   ├── vite.config.ts
│   └── tsconfig.json
├── start.sh                   # Production start script
├── .env.example
└── README.md
```

---

## Getting started

### Prerequisites

- Python 3.10+
- Node.js 20+
- npm

### 1. Clone and install

```bash
git clone https://github.com/<your-username>/snapbooth.git
cd snapbooth
```

### 2. Backend setup

```bash
cd backend
python -m venv .venv
# Windows
.venv\Scripts\activate
# macOS/Linux
source .venv/bin/activate

pip install -r requirements.txt
cp .env.example .env   # Edit if needed
python run.py
```

The API starts at `http://localhost:8000`.

### 3. Frontend setup

```bash
cd frontend
npm install
npm run dev
```

The dev server starts at `http://localhost:5173` with API proxy to port 8000.

### 4. Open the app

Visit `http://localhost:5173` in your browser. Grant camera access when prompted.

---

## Environment variables

| Variable | Default | Description |
|----------|---------|-------------|
| `DATABASE_URL` | `sqlite:///./snapbooth.db` | Database connection string |
| `UPLOAD_DIR` | `./uploads` | Directory for captured images |
| `MAX_IMAGE_SIZE` | `2048` | Max image dimension in pixels |
| `JPEG_QUALITY` | `95` | Output JPEG quality (1–100) |
| `ALLOWED_ORIGINS` | `http://localhost:5173` | CORS origins (comma-separated) |
| `SITE_URL` | `http://localhost:5173` | Public URL for invite links |
| `PORT` | `8000` | Server port (Render sets this) |

Copy `.env.example` to `.env` and adjust for your environment.

---

## API overview

All endpoints are prefixed with `/api`.

### Capture

| Method | Path | Description |
|--------|------|-------------|
| `POST` | `/capture/composite` | Save a layout composite to the gallery |

### Gallery

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/gallery/` | List saved images (paginated) |
| `GET` | `/gallery/{id}` | Get image details |
| `PATCH` | `/gallery/{id}` | Update favourite, text, filter |
| `DELETE` | `/gallery/{id}` | Delete an image |
| `POST` | `/gallery/export` | Export selected images as PDF |
| `GET` | `/gallery/{id}/qr` | Generate QR code for sharing |
| `GET` | `/gallery/{id}/download` | Download original image |

### Filters

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/filters/` | List available filters |
| `POST` | `/filters/preview` | Preview a filter on an image |

### Sessions

| Method | Path | Description |
|--------|------|-------------|
| `POST` | `/sessions/create` | Create a shared session |
| `GET` | `/sessions/{token}` | Get session info & participants |
| `POST` | `/sessions/{token}/capture` | Submit a photo as a participant |
| `POST` | `/sessions/{token}/finalize` | Manually finalize a session |

### Health

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/api/health` | Health check |

---

## Screenshots

<!-- TODO: Add screenshots -->

| Capture page | Gallery | Shared session |
|---|---|---|
| _screenshot_ | _screenshot_ | _screenshot_ |

---

## Roadmap

- [x] Core capture flow with filters and layouts
- [x] Gallery with favourite, delete, download
- [x] Async shared sessions with invite links
- [x] Composite image generation
- [x] QR code sharing
- [x] PDF export
- [ ] WebSocket real-time updates
- [ ] User authentication
- [ ] Cloud storage (S3)
- [ ] Docker deployment
- [ ] AI background removal
- [ ] Session analytics

---

## Contributing

Contributions are welcome. Please open an issue first to discuss what you'd like to change.

1. Fork the repository
2. Create a feature branch (`git checkout -b feat/my-feature`)
3. Commit your changes (`git commit -m 'feat: add my feature'`)
4. Push to the branch (`git push origin feat/my-feature`)
5. Open a Pull Request

---

## License

MIT — see [LICENSE](LICENSE).

---

## Credits

Built with [FastAPI](https://fastapi.tiangolo.com/), [React](https://react.dev/), [Vite](https://vite.dev/), [Tailwind CSS](https://tailwindcss.com/), and [Pillow](https://python-pillow.org/).
