#!/usr/bin/env bash
# The CMS the way production runs it -- on this machine, and nowhere else.
#
# Not `runserver`: gunicorn. Not DEBUG: off, signing with a key generated for
# this run. Not Django serving /media/: a separate static host, the shape of an
# object store or a CDN in front of the library. And the gates a deployment has
# to pass -- migrations, `collectstatic`, `check --deploy` -- run first; a
# failure in any of them stops the run before a single test starts.
#
# Everything is throwaway: its own database, and media, static and private
# roots in a temporary directory, all removed on exit.
set -euo pipefail

cd "$(dirname "$0")/.."

PY=.venv/bin/python
WORK="$(mktemp -d "${TMPDIR:-/tmp}/wjeen-prod-e2e.XXXXXX")"
MEDIA_PORT="${PROD_E2E_MEDIA_PORT:-8025}"
API_PORT="${PROD_E2E_API_PORT:-8021}"

export POSTGRES_DB="${POSTGRES_DB:-wjeen_cms_prod_e2e}"
export DJANGO_DEBUG=0
# Given by playwright.production.config.ts, so the tests can prove it never
# reached a browser. There is deliberately no fallback.
export DJANGO_SECRET_KEY="${DJANGO_SECRET_KEY:?the production harness must be given a secret key}"
export WJEEN_INQUIRY_TOKEN="${WJEEN_INQUIRY_TOKEN:?the production harness must be given an inquiry token}"
export DJANGO_ALLOWED_HOSTS="localhost,127.0.0.1"
export CORS_ALLOWED_ORIGINS="http://localhost:3131"
export CSRF_TRUSTED_ORIGINS="http://localhost:3131"
export WJEEN_MEDIA_ROOT="$WORK/media-root"
export WJEEN_MEDIA_URL="http://localhost:${MEDIA_PORT}/media/"
export WJEEN_STATIC_ROOT="$WORK/static-root"
export WJEEN_PRIVATE_ROOT="$WORK/private-root"

PIDS=()
cleanup() {
  for pid in "${PIDS[@]:-}"; do
    [[ -n "$pid" ]] && kill "$pid" 2>/dev/null || true
  done
  wait 2>/dev/null || true
  dropdb --force --if-exists "$POSTGRES_DB" 2>/dev/null || true
  rm -rf "$WORK"
}
trap cleanup EXIT INT TERM

dropdb --force --if-exists "$POSTGRES_DB"
createdb "$POSTGRES_DB"

$PY manage.py migrate --noinput --verbosity 0
$PY manage.py import_messages --verbosity 0
$PY manage.py import_media --verbosity 0
$PY manage.py collectstatic --noinput --verbosity 0

# The deployment gate, with the HTTPS settings a real deployment sets. A check
# only: this machine has no TLS, so the server below must not redirect to it.
DJANGO_SECURE_SSL_REDIRECT=1 \
DJANGO_SECURE_HSTS_SECONDS=31536000 \
DJANGO_SECURE_HSTS_INCLUDE_SUBDOMAINS=1 \
DJANGO_SECURE_PROXY_SSL_HEADER=1 \
  $PY manage.py check --deploy --fail-level WARNING

$PY manage.py shell -c "
from django.contrib.auth import get_user_model
User = get_user_model()
User.objects.filter(username='content-e2e').delete()
User.objects.create_user(username='content-e2e', password='content-e2e-password', is_staff=True)
" > /dev/null

# The media host: a plain static server over MEDIA_ROOT, and nothing else. The
# private root is a sibling in $WORK and is never linked in -- the same rule a
# real web server's configuration has to keep.
mkdir -p "$WORK/media-host"
ln -s "$WJEEN_MEDIA_ROOT" "$WORK/media-host/media"
python3 -m http.server "$MEDIA_PORT" --bind 127.0.0.1 --directory "$WORK/media-host" > /dev/null 2>&1 &
PIDS+=($!)

.venv/bin/gunicorn config.wsgi:application \
  --bind "127.0.0.1:${API_PORT}" \
  --workers 2 \
  --timeout 30 \
  --access-logfile - \
  --error-logfile - &
PIDS+=($!)

wait
