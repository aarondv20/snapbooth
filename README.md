# 📸 SnapBooth

A real-time collaborative web photobooth built with **FastAPI**, **React**, **TypeScript**, and **PostgreSQL**. Users can join a shared session, capture photos together, apply filters, and download their pictures.

## 🚀 Features

- Real-time shared photo sessions
- Join using a share link or QR code
- Live camera preview
- Photo filters
- Shared gallery
- Download captured photos
- Responsive design

## 🛠️ Tech Stack

### Frontend
- React
- TypeScript
- Vite
- Tailwind CSS

### Backend
- FastAPI
- Python
- WebSockets

### Database
- PostgreSQL

## 📂 Project Structure

```text
snapbooth/
├── frontend/
├── backend/
├── database/
├── assets/
└── README.md
```

## ⚙️ Getting Started

1. Clone the repository.

```bash
git clone https://github.com/aarondv20/snapbooth.git
```

2. Install frontend dependencies.

```bash
cd frontend
npm install
npm run dev
```

3. Install backend dependencies.

```bash
cd backend
pip install -r requirements.txt
uvicorn main:app --reload
```

## 📌 Status

🚧 This project is currently under development. More features and improvements will be added over time.

## 📄 License

This project is licensed under the MIT License.
