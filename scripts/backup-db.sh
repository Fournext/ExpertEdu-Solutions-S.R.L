#!/usr/bin/env bash
set -euo pipefail

BACKUP_DIR="${BACKUP_DIR:-./backups}"
TIMESTAMP="$(date +%Y%m%d_%H%M%S)"
CONTAINER_NAME="${POSTGRES_CONTAINER:-expertedu-corp-postgres-prod}"
DB_NAME="${POSTGRES_DB:-expertedu_corp}"
DB_USER="${POSTGRES_USER:-expertedu_corp_user}"

mkdir -p "$BACKUP_DIR"
OUT_FILE="${BACKUP_DIR}/expertedu_corp_${TIMESTAMP}.sql.gz"

echo "Creating PostgreSQL backup in ${OUT_FILE}..."
docker exec -t "$CONTAINER_NAME" pg_dump -U "$DB_USER" -d "$DB_NAME" | gzip > "$OUT_FILE"
echo "Backup completed: ${OUT_FILE}"
