#!/usr/bin/env bash
# The four site instances the content pipeline is proved against.
#
# One production build, started four times with different runtime environment —
# which is only possible because `WJEEN_CONTENT_SOURCE`, `NEXT_PUBLIC_CMS_API_URL`
# and `WJEEN_CONTENT_REVALIDATE` are read by *server* code at run time. (The
# NEXT_PUBLIC_ one is still inlined into the browser bundle at build time; the
# studio's client uses that, nothing here does.)
#
#   3111  json    — the default. Must ignore the CMS completely.
#   3112  cms     — the live path. Short revalidate window so a publish can be
#                   observed without a test sitting still for a minute.
#   3113  cms     — pointed at a port where nothing listens: CMS unavailable.
#   3114  cms     — pointed at the hang stub: CMS reachable but never answers.
#   3115  json    — also pointed at the hang stub, and this is the one that
#                   turns "does not call the content API" from a claim into a
#                   measurement: a call would cost 1.5s, so if no render ever
#                   does, no render ever called. 3114 is its control.
#
# Ports are in the 31xx range precisely so that a developer's `next dev` on 3000
# and the studio suite's server on 3100 can both be running while this suite
# runs. Nothing here is allowed to adopt an existing server -- see
# `reuseExistingServer: false` in playwright.content.config.ts.
set -euo pipefail

cd "$(dirname "$0")/../.."

CMS="http://localhost:${CONTENT_E2E_PORT:-8011}"
HANG="http://localhost:${CONTENT_E2E_HANG_PORT:-8018}"
# Nothing ever listens here. That is the point.
DEAD="http://localhost:${CONTENT_E2E_DEAD_PORT:-8019}"
# Must match cms/scripts/content-e2e-api.sh, or a submission is a 403.
TOKEN="content-e2e-inquiry-token"

# Mail is not merely unconfigured here, it is explicitly emptied: an empty
# value set in the environment beats .env.local, and src/lib/mailer.ts throws
# on a missing MAIL_TO *before* it constructs a provider client. So no test in
# this suite can reach the network, whatever key a developer keeps locally.

PIDS=()
cleanup() {
  for pid in "${PIDS[@]:-}"; do
    [[ -n "$pid" ]] && kill "$pid" 2>/dev/null || true
  done
}
trap cleanup EXIT INT TERM

node tests/content/hang-stub.mjs &
PIDS+=($!)

# NEXT_PUBLIC_CMS_API_URL is deliberately NOT set for this build, and that is
# load-bearing rather than an oversight.
#
# Next inlines a NEXT_PUBLIC_ variable that has a value at build time into the
# SERVER bundle as well as the browser one. Setting it here bakes one origin
# into all five instances, and :3113 and :3114 then quietly read the live CMS
# instead of the dead port and the hang stub they exist to test — the suite
# stays green while testing nothing. Measured: six occurrences in
# .next/server/chunks.
#
# Left unset, the expression survives to run time and each instance honours
# the origin it is started with. The cost is that the studio's *browser*
# client falls back to its development origin, so the studio is only checked
# here for rendering; its behaviour is the main suite's job.
npx next build

start() { # port, source, origin, revalidate
  WJEEN_CONTENT_SOURCE="$2" \
  NEXT_PUBLIC_CMS_API_URL="$3" \
  WJEEN_CONTENT_REVALIDATE="$4" \
  WJEEN_MEDIA_REVALIDATE=1 \
  WJEEN_INQUIRY_TOKEN="$TOKEN" \
  MAIL_PROVIDER_API_KEY= \
  MAIL_TO= \
  MAIL_FROM= \
  npx next start --port "$1" &
  PIDS+=($!)
}

wait_for() {
  for _ in $(seq 1 60); do
    curl -sf -o /dev/null "http://localhost:$1/en" && return 0
    sleep 1
  done
  echo "site on $1 never came up" >&2
  return 1
}

start 3111 json "$CMS" 1
start 3112 cms "$CMS" 3
start 3113 cms "$DEAD" 1
start 3115 json "$HANG" 1
wait_for 3111 && wait_for 3112 && wait_for 3113 && wait_for 3115

# Started last and healthchecked by Playwright, so that by the time the runner
# believes the fixture is up, all four really are. Its own readiness costs the
# 1.5s timeout once, which is exactly the behaviour under test.
start 3114 cms "$HANG" 1

wait
