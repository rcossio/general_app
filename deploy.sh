#!/bin/bash
set -e

APP_DIR="/home/deploy/general_app"

echo "==> Pulling latest code..."
cd "$APP_DIR"
git pull origin main

echo "==> Installing dependencies..."
npm ci --production=false

echo "==> Running database migrations..."
npx prisma migrate deploy

echo "==> Building application..."
npm run build

echo "==> Reloading PM2 (zero-downtime)..."
pm2 reload ecosystem.config.js --update-env

echo "==> Deploy complete."
