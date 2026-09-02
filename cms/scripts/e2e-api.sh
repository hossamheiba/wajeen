#!/usr/bin/env bash
# Boots a throwaway CMS API for the studio end-to-end tests.
#
# Its own database, seeded from the repository JSON, so a test run can publish
# and roll back without touching the development data. The repository files are
# only ever read.
set -euo pipefail

cd "$(dirname "$0")/.."

export POSTGRES_DB="${POSTGRES_DB:-wjeen_cms_e2e}"
export DJANGO_DEBUG=1
export CORS_ALLOWED_ORIGINS="${CORS_ALLOWED_ORIGINS:-http://localhost:3100}"
export CSRF_TRUSTED_ORIGINS="${CSRF_TRUSTED_ORIGINS:-http://localhost:3100}"

PY=.venv/bin/python

dropdb --if-exists "$POSTGRES_DB"
createdb "$POSTGRES_DB"

$PY manage.py migrate --noinput --verbosity 0
$PY manage.py import_messages --verbosity 0
$PY manage.py shell -c "
from django.contrib.auth import get_user_model
User = get_user_model()
User.objects.filter(username='editor').delete()
User.objects.create_user(username='editor', password='studio-e2e-password', is_staff=True)
User.objects.filter(username='visitor').delete()
User.objects.create_user(username='visitor', password='studio-e2e-password')
print('seeded')
"

exec $PY manage.py runserver 8001 --noreload
