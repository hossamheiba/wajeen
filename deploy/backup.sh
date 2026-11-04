#!/usr/bin/env bash
# Daily backup of everything on this server that cannot be rebuilt:
# the database, the media library, the private CV volume, and the configuration.
# Kept for 14 days in /opt/wjeen/backups. Run by cron at 03:15 (server time).
set -euo pipefail
cd /opt/wjeen
ROOT=/opt/wjeen/backups
STAMP="$(date -u +%Y%m%dT%H%M%SZ)"
DIR="$ROOT/$STAMP"
umask 077
mkdir -p "$DIR"

docker compose exec -T db sh -c 'pg_dump -U "$POSTGRES_USER" --no-owner --no-acl "$POSTGRES_DB"' | gzip -9 > "$DIR/db.sql.gz"
for vol in cms-media cms-private; do
  docker run --rm -v "wjeen_${vol}:/src:ro" -v "$DIR:/out" alpine tar czf "/out/${vol}.tar.gz" -C /src .
done
tar czf "$DIR/config.tar.gz" -C /opt/wjeen .env docker-compose.yml Caddyfile

# Prove the copy is readable before keeping it.
gzip -t "$DIR/db.sql.gz" "$DIR/cms-media.tar.gz" "$DIR/cms-private.tar.gz" "$DIR/config.tar.gz"
test "$(gzip -dc "$DIR/db.sql.gz" | wc -c)" -gt 10000
test "$(gzip -dc "$DIR/db.sql.gz" | grep -c 'content_contentversion')" -gt 0

# Keep the last 14 days.
find "$ROOT" -mindepth 1 -maxdepth 1 -type d -mtime +14 -exec rm -rf {} +
echo "ok $STAMP $(du -sh "$DIR" | cut -f1)"
