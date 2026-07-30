#!/usr/bin/env bash
set -e

# This script lives at the project root (where backend/ and frontend/ live)
cd "$(dirname "$0")"

# Build frontend if not already built
if [ ! -d "frontend/dist" ]; then
  echo "Building frontend..."
  cd frontend && npm ci && npm run build && cd ..
fi

# Start backend
cd backend && python run.py
