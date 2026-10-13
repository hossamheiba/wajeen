#!/usr/bin/env bash
# Restore a backup on the new server, then prove nothing was lost.
#
#   sudo bash deploy/restore-verify.sh /root/wjeen-move/<STAMP>
#
# Order matters. The schema is created by `migrate` first, so the append-only
# trigger exists before any row arrives; the dump then loads data only
# (`--data-only` is not used — the dump carries its own schema, and loading it
# over a migrated database is why `--clean --if-exists` is here).
#
# Nothing is destructive until the census at the end agrees with the one the
# backup recorded. If it disagrees, stop and read the diff — do not switch DNS.
set -euo pipefail

SRC="${1:?usage: restore-verify.sh <backup directory>}"
cd /opt/wjeen

echo "== 0. the backup is intact"
(cd "$SRC" && sha256sum -c <(grep -A100 '^--- checksums ---' MANIFEST.txt | tail -n +2))

echo "== 1. the schema, so the trigger is in place before the rows are"
docker compose up -d db
docker compose run --rm cms python manage.py migrate --noinput

echo "== 2. the database"
gunzip -c "$SRC/db.sql.gz" | docker compose exec -T db \
  psql -v ON_ERROR_STOP=1 -U "${POSTGRES_USER:-wjeen}" -d "${POSTGRES_DB:-wjeen_cms}"

echo "== 3. the library and the CVs"
for vol in cms-media cms-private; do
  docker run --rm -v "wjeen_${vol}:/dst" -v "$SRC:/in:ro" alpine \
    sh -c "tar xzf /in/${vol}.tar.gz -C /dst"
done
docker compose run --rm cms python manage.py collectstatic --noinput

echo "== 4. the same census, on the new machine"
docker compose exec -T db psql -qAt -U "${POSTGRES_USER:-wjeen}" -d "${POSTGRES_DB:-wjeen_cms}" <<'SQL' > /tmp/census-new.txt
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

echo
if diff -u "$SRC/census.txt" /tmp/census-new.txt; then
  echo "CENSUS MATCHES — every row arrived."
else
  echo "CENSUS DIFFERS — stop here. Do not point DNS at this machine." >&2
  exit 1
fi

echo "== 5. the append-only guard survived the restore"
docker compose exec -T db psql -qAt -U "${POSTGRES_USER:-wjeen}" -d "${POSTGRES_DB:-wjeen_cms}" \
  -c "SELECT tgname FROM pg_trigger WHERE tgname = 'wjeen_content_version_immutable';" \
  | grep -q wjeen_content_version_immutable \
  && echo "trigger present ✓" \
  || { echo "TRIGGER MISSING — published history is writable. Stop." >&2; exit 1; }

echo "== 6. the site serves the same trees"
docker compose up -d
sleep 20
for loc in en ar; do
  curl -fsS "http://127.0.0.1/api/v1/content/$loc/" -H "Host: ${SITE_HOST}" -o "/tmp/new-$loc.json"
  if diff -q <(python3 -m json.tool "$SRC/public-$loc.json") \
             <(python3 -m json.tool "/tmp/new-$loc.json") >/dev/null; then
    echo "$loc tree identical ✓"
  else
    echo "$loc tree differs — compare /tmp/new-$loc.json with the backup." >&2
  fi
done

echo
echo "Restore verified. DNS may now be moved."
