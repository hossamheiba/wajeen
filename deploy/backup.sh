#!/usr/bin/env bash
# Take everything that cannot be rebuilt, and prove the copy is faithful.
#
# Run it on the server that is being left:
#
#   sudo bash deploy/backup.sh /root/wjeen-move
#
# Three things leave the machine. The database holds the content blocks, the
# published history, the editors and the contact-form submissions. The media
# volume holds the library's images. The private volume holds the CVs, which
# are deliberately on a volume Caddy is never pointed at.
#
# What is NOT backed up, because it is rebuilt: the images (Artifact Registry),
# the site's own text (`import_messages` restores it from the repository), and
# the TLS certificates (the new host issues its own).
#
# `pg_dump` is safe against the append-only trigger: the trigger fires BEFORE
# UPDATE and BEFORE DELETE, never on INSERT, so a restore loads the whole
# revision history without the guard having to be lifted for a moment.
set -euo pipefail

OUT="${1:-/root/wjeen-move}"
STAMP="$(date -u +%Y%m%dT%H%M%SZ)"
DIR="$OUT/$STAMP"
mkdir -p "$DIR"
cd /opt/wjeen

echo "== 1. the database"
docker compose exec -T db pg_dump -U "${POSTGRES_USER:-wjeen}" --no-owner --no-acl \
  "${POSTGRES_DB:-wjeen_cms}" | gzip -9 > "$DIR/db.sql.gz"

echo "== 2. the library and the CVs"
for vol in cms-media cms-private; do
  docker run --rm -v "wjeen_${vol}:/src:ro" -v "$DIR:/out" alpine \
    tar czf "/out/${vol}.tar.gz" -C /src .
done

echo "== 3. the numbers that have to match after the restore"
docker compose exec -T db psql -qAt -U "${POSTGRES_USER:-wjeen}" -d "${POSTGRES_DB:-wjeen_cms}" <<'SQL' > "$DIR/census.txt"
SELECT 'content_blocks        ' || count(*) FROM content_contentblock;
SELECT 'pending_drafts        ' || count(*) FROM content_contentblock WHERE draft_data IS NOT NULL;
SELECT 'published_revisions   ' || count(*) FROM content_contentversion;
SELECT 'current_revision      ' || coalesce(max(number)::text,'none') FROM content_contentversion WHERE is_current;
SELECT 'media_assets          ' || count(*) FROM media_library_mediaasset;
SELECT 'media_bindings        ' || count(*) FROM media_library_mediabinding;
SELECT 'inquiries             ' || count(*) FROM inquiries_inquiry;
SELECT 'cv_files              ' || count(*) FROM inquiries_privatefile;
SELECT 'editors               ' || count(*) FROM auth_user;
SQL

echo "== 4. the English and Arabic trees, as served"
for loc in en ar; do
  curl -fsS "https://${SITE_HOST:-wjeen.yellostack.com}/api/v1/content/$loc/" \
    -o "$DIR/public-$loc.json"
done

{ echo "taken      $STAMP"
  echo "from       $(hostname)"
  cat "$DIR/census.txt"
  echo "--- sizes ---"
  du -h "$DIR"/*.gz | sed 's|.*/||'
  echo "--- checksums ---"
  (cd "$DIR" && sha256sum *.gz *.json)
} > "$DIR/MANIFEST.txt"

cat "$DIR/MANIFEST.txt"
echo
echo "Backup complete: $DIR"
echo "Copy the whole directory off the machine, then verify with deploy/restore-verify.sh."
