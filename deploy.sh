#!/bin/bash
set -e

APP_DIR="/var/www/app"

echo "==> Pulling latest code..."
cd "$APP_DIR"
git pull origin main

echo "==> Installing dependencies..."
npm ci --production=false

echo "==> Running database migrations..."
npx prisma migrate deploy

echo "==> Stopping PM2 before build..."
pm2 stop all

echo "==> Building application..."
npm run build

echo "==> Reloading PM2..."
pm2 reload ecosystem.config.js --update-env || pm2 start ecosystem.config.js
pm2 save

echo "==> Deploy complete."
