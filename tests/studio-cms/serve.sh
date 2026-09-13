#!/usr/bin/env bash
# One site instance: the studio, enabled, reading its text from the CMS.
#
# This is the other half of tests/content/serve.sh, and the split is not a
# convenience — it is the shape of the problem.
#
# `NEXT_PUBLIC_CMS_API_URL` behaves differently depending on whether it has a
# value when `next build` runs:
#
#   set at build    the value is inlined into the browser bundle AND into the
#                   server chunks. The studio works, because its client knows
#                   an origin. Nothing can be repointed at run time.
#   unset at build  the expression survives into server code, so each instance
#                   honours the origin it is started with — which is what lets
#                   the content harness run an instance against a dead port and
#                   another against a stub. But the studio 404s by design
#                   (STUDIO_CONFIGURED in src/lib/studio/api.ts), because a
#                   sign-in screen that cannot reach anything is worse than no
#                   screen at all.
#
# One build cannot be both. So there are two harnesses, each internally
# consistent, and this one is the configuration production actually ships:
# origin known at build, studio present, text from the CMS.
set -euo pipefail

cd "$(dirname "$0")/../.."

CMS="http://localhost:${STUDIO_E2E_CMS_PORT:-8021}"
PORT="${STUDIO_E2E_PORT:-3131}"

PIDS=()
cleanup() {
  for pid in "${PIDS[@]:-}"; do
    [[ -n "$pid" ]] && kill "$pid" 2>/dev/null || true
  done
}
trap cleanup EXIT INT TERM

NEXT_PUBLIC_CMS_API_URL="$CMS" npx next build

# Mail emptied explicitly: an empty value in the environment beats .env.local,
# and src/lib/mailer.ts throws on a missing MAIL_TO before it builds a provider
# client, so nothing in this suite can reach a mail network.
WJEEN_CONTENT_SOURCE=cms \
NEXT_PUBLIC_CMS_API_URL="$CMS" \
WJEEN_CONTENT_REVALIDATE=2 \
WJEEN_MEDIA_REVALIDATE=1 \
WJEEN_INQUIRY_TOKEN="content-e2e-inquiry-token" \
MAIL_PROVIDER_API_KEY= \
MAIL_TO= \
MAIL_FROM= \
npx next start --port "$PORT" &
PIDS+=($!)

wait
