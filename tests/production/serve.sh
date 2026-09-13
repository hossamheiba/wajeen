#!/usr/bin/env bash
# The site and studio as one production build, pointed at the production-shaped
# CMS started by cms/scripts/production-e2e-api.sh.
#
# Both origins are passed to the build AND to the server, and must agree: they
# are build-time inputs (see .env.example), but `next start` re-evaluates
# next.config.ts, so next/image's allow-list is read again at run time.
set -euo pipefail

cd "$(dirname "$0")/../.."

CMS="http://localhost:${PROD_E2E_API_PORT:-8021}"
MEDIA="http://localhost:${PROD_E2E_MEDIA_PORT:-8025}"
PORT="${PROD_E2E_SITE_PORT:-3131}"

PIDS=()
cleanup() {
  for pid in "${PIDS[@]:-}"; do
    [[ -n "$pid" ]] && kill "$pid" 2>/dev/null || true
  done
}
trap cleanup EXIT INT TERM

NEXT_PUBLIC_CMS_API_URL="$CMS" NEXT_PUBLIC_CMS_MEDIA_URL="$MEDIA" npx next build

# Mail emptied explicitly: an empty value beats .env.local, and the mailer
# throws before it builds a provider client -- nothing here reaches a mail API.
WJEEN_CONTENT_SOURCE=cms \
NEXT_PUBLIC_CMS_API_URL="$CMS" \
NEXT_PUBLIC_CMS_MEDIA_URL="$MEDIA" \
WJEEN_CONTENT_REVALIDATE=2 \
WJEEN_MEDIA_REVALIDATE=1 \
WJEEN_INQUIRY_TOKEN="${WJEEN_INQUIRY_TOKEN:?the site must be given the inquiry token}" \
MAIL_PROVIDER_API_KEY= \
MAIL_TO= \
MAIL_FROM= \
npx next start --port "$PORT" &
PIDS+=($!)

wait
