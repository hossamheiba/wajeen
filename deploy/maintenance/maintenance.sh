#!/usr/bin/env bash
# Take the whole site (website, studio, API) down for maintenance, or bring it
# back. Run on the server:
#
#   /opt/wjeen/maintenance.sh on      show the maintenance page, stop site + cms
#   /opt/wjeen/maintenance.sh off     start site + cms, restore the real Caddyfile
#   /opt/wjeen/maintenance.sh status
#
# The database keeps running, so the nightly backup (03:15) still works, and
# nothing is deleted: `on` only stops two containers and swaps a Caddy config.
set -euo pipefail
cd /opt/wjeen

reload() { docker compose exec -T caddy caddy reload --config /etc/caddy/Caddyfile --force >/dev/null; }

case "${1:-status}" in
  on)
    [ -f Caddyfile.live ] || cp Caddyfile Caddyfile.live          # the real one, kept safe
    cp maintenance/Caddyfile.maintenance Caddyfile
    reload                                                         # the page first, then stop the apps
    docker compose stop site cms
    echo "maintenance: ON"
    ;;
  off)
    docker compose up -d site cms
    for i in $(seq 1 30); do
      docker compose exec -T site wget -q -O /dev/null http://127.0.0.1:8080/ 2>/dev/null && break
      sleep 2
    done
    cp Caddyfile.live Caddyfile
    reload
    echo "maintenance: OFF (site and cms started, real Caddyfile restored)"
    ;;
  status)
    if cmp -s Caddyfile maintenance/Caddyfile.maintenance; then echo "maintenance: ON"; else echo "maintenance: OFF"; fi
    docker compose ps --format '{{.Service}} {{.State}}'
    ;;
  *) echo "usage: $0 on|off|status" >&2; exit 2 ;;
esac
