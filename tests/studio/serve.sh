#!/usr/bin/env bash
# Serves the site for the studio end-to-end tests.
#
# A production build rather than `next dev`, for two reasons: only one dev
# server can run per directory, and the built output is what actually ships —
# including the statically generated studio shells the tests inspect.
set -euo pipefail

export NEXT_PUBLIC_CMS_API_URL="${NEXT_PUBLIC_CMS_API_URL:-http://localhost:8001}"

npx next build
exec npx next start --port "${PORT:-3100}"
