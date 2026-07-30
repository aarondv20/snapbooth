#!/usr/bin/env bash
set -e

# Build frontend if not already built
if [ ! -d "frontend/dist" ]; then
  echo "Building frontend..."
  cd frontend && npm ci && npm run build && cd ..
fi

# Start backend
cd backend && python run.py
