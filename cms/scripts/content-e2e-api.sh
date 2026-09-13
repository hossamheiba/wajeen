#!/usr/bin/env bash
# Boots the CMS for the content-pipeline tests, and nothing else.
#
# Deliberately NOT the same server as `e2e-api.sh`: these tests publish and roll
# back real content, and they must never be able to reach the development
# database, the review server, or the studio suite's own database. So this one
# has its own port, its own database and its own account, all named for it.
#
# The database is dropped on the way in AND on the way out: a run leaves no
# trace, and a crashed run cannot poison the next one.
set -euo pipefail

cd "$(dirname "$0")/.."

export POSTGRES_DB="${POSTGRES_DB:-wjeen_cms_content_e2e}"
export DJANGO_DEBUG=1
# The site instances this CMS is driven by. Every one of them is an origin
# Django must trust for a cross-origin login to work at all. Overridable
# because the studio harness (playwright.studio-cms.config.ts) runs one
# instance on a port of its own and reuses this script rather than copying it.
export CORS_ALLOWED_ORIGINS="${CORS_ALLOWED_ORIGINS:-http://localhost:3111,http://localhost:3112,http://localhost:3113,http://localhost:3114,http://localhost:3115}"
export CSRF_TRUSTED_ORIGINS="${CSRF_TRUSTED_ORIGINS:-$CORS_ALLOWED_ORIGINS}"
# The shared secret the site presents when it stores a submission. Must match
# the one tests/content/serve.sh gives every site instance.
export WJEEN_INQUIRY_TOKEN="${WJEEN_INQUIRY_TOKEN:-content-e2e-inquiry-token}"
# Private files: a throwaway directory, never MEDIA_ROOT, never the real one.
export WJEEN_PRIVATE_ROOT="${WJEEN_PRIVATE_ROOT:-$PWD/privatefiles-content-e2e}"

PY=.venv/bin/python
PORT="${CONTENT_E2E_PORT:-8011}"

cleanup() {
  # Kill the server first so nothing holds a connection open, then drop.
  # `--force` because the runner may not have waited for the socket to close,
  # and a database left behind is the one thing this script must not do.
  [[ -n "${SERVER_PID:-}" ]] && kill "$SERVER_PID" 2>/dev/null || true
  wait "${SERVER_PID:-}" 2>/dev/null || true
  dropdb --force --if-exists "$POSTGRES_DB" 2>/dev/null || dropdb --if-exists "$POSTGRES_DB" 2>/dev/null || true
  rm -rf "$WJEEN_PRIVATE_ROOT"
}
trap cleanup EXIT INT TERM

dropdb --if-exists "$POSTGRES_DB"
createdb "$POSTGRES_DB"

$PY manage.py migrate --noinput --verbosity 0
# The repository JSON, imported the ordinary way. The equality gate
# (content/tests/test_public_parity.py) is what proves this is the same tree
# the site has bundled; these tests then change it on purpose.
$PY manage.py import_messages --verbosity 0
# No media import: nothing here touches images, and the site falls back to the
# copies under /public exactly as it does when the library is empty.
$PY manage.py shell -c "
from django.contrib.auth import get_user_model
User = get_user_model()
User.objects.filter(username='content-e2e').delete()
User.objects.create_user(username='content-e2e', password='content-e2e-password', is_staff=True)
print('seeded')
"

$PY manage.py runserver "$PORT" --noreload &
SERVER_PID=$!
wait "$SERVER_PID"
