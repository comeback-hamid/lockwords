#!/usr/bin/env bash
# Run Maestro flows. Usage: npm run e2e [-- --areas review,speak]
set -euo pipefail
cd "$(dirname "$0")/.."
areas=""
while [[ $# -gt 0 ]]; do
  case "$1" in
    --areas) areas="$2"; shift 2 ;;
    *) echo "unknown option: $1" >&2; exit 2 ;;
  esac
done
command -v maestro >/dev/null || { echo "maestro is not installed: brew install mobile-dev-inc/tap/maestro" >&2; exit 1; }
xcrun simctl list devices booted | grep -q Booted || { echo "No booted iOS simulator. Run: cd apps/mobile && npm run ios" >&2; exit 1; }
if [[ -n "$areas" ]]; then
  exec maestro test e2e/flows --include-tags="$areas"
else
  exec maestro test e2e/flows
fi
