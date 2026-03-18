#!/bin/bash
# Schedule as daily cron: 0 2 * * * /home/deploy/backup.sh
set -e

DB_NAME="${PGDATABASE:-appdb}"
BACKUP_DIR="/tmp/db_backups"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
FILENAME="${DB_NAME}_${TIMESTAMP}.sql.gz"
R2_PATH="backups/${FILENAME}"

# Create temp dir
mkdir -p "$BACKUP_DIR"

echo "==> Creating database dump..."
pg_dump "$DB_NAME" | gzip > "${BACKUP_DIR}/${FILENAME}"

echo "==> Uploading to Cloudflare R2..."
# Requires rclone configured with an R2 remote named 'r2'
# Setup: rclone config → New remote → Cloudflare R2
rclone copy "${BACKUP_DIR}/${FILENAME}" "r2:${R2_BUCKET_NAME}/${R2_PATH}"

echo "==> Cleaning local backup file..."
rm -f "${BACKUP_DIR}/${FILENAME}"

echo "==> Removing backups older than 7 days from R2..."
rclone delete "r2:${R2_BUCKET_NAME}/backups/" \
  --min-age 7d

echo "==> Backup complete: ${R2_PATH}"
