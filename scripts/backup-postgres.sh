#!/usr/bin/env bash
set -euo pipefail
# Logical dump for disaster recovery drills. Managed Postgres PITR is the primary backup (see docs/runbooks/BACKUPS.md).
# Does not run in CI. Requires pg_dump (PostgreSQL 16 client).

if [[ -z "${DATABASE_URL:-}" ]]; then
  echo "DATABASE_URL is required" >&2
  exit 1
fi

if ! command -v pg_dump >/dev/null 2>&1; then
  echo "pg_dump not found. Install PostgreSQL 16 client tools." >&2
  exit 1
fi

root="$(cd "$(dirname "$0")/.." && pwd)"
outdir="${BACKUP_DIR:-$root/backups}"
mkdir -p "$outdir"
stamp="$(date -u +%Y%m%dT%H%M%SZ)"
file="$outdir/tcg-platform-$stamp.dump"

pg_dump --format=custom --no-owner --file="$file" "$DATABASE_URL"
echo "Wrote $file"
