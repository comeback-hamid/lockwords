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
# Maestro saves recordings under a dated run folder. We copy them to e2e/videos/<name>.mp4 afterwards.
run=$(mktemp -d)
status=0
if [[ -n "$areas" ]]; then
  maestro ${MAESTRO_DEVICE:+--device "$MAESTRO_DEVICE"} test e2e/flows --include-tags="$areas" --test-output-dir "$run" || status=$?
else
  maestro ${MAESTRO_DEVICE:+--device "$MAESTRO_DEVICE"} test e2e/flows --test-output-dir "$run" || status=$?
fi
mkdir -p e2e/videos
find "$run" -name '*.mp4' -exec cp {} e2e/videos/ \;
rm -rf "$run"
exit $status
