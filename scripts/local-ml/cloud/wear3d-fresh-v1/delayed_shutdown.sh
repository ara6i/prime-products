#!/usr/bin/env bash
set -euo pipefail

if [[ "${1:-}" == "-h" && "${2:-}" == "now" ]]; then
  sleep 120
fi
real_shutdown=/usr/sbin/shutdown.real
if [[ ! -x "$real_shutdown" ]]; then
  real_shutdown=/usr/sbin/shutdown
fi
exec "$real_shutdown" "$@"
