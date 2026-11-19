#!/usr/bin/env bash
# Run Maestro flows. Usage: npm run e2e [-- --areas review,my-words]
set -euo pipefail
cd "$(dirname "$0")/.."
areas=""
while [[ $# -gt 0 ]]; do
  case "$1" in
    --areas) areas="$2"; shift 2 ;;
    *) echo "unknown option: $1" >&2; exit 2 ;;
  esac
done
# Maestro runs `flutter --version` when it starts. On a Mac with Flutter installed and a slow network, that call hangs
# and Maestro never starts (found 2026-11-17). Lockwords has no Flutter, so take Flutter off the PATH for Maestro.
PATH=$(printf '%s' "$PATH" | tr ':' '\n' | grep -v '/flutter/' | paste -sd: -)
export PATH
command -v maestro >/dev/null || { echo "maestro is not installed: brew install mobile-dev-inc/tap/maestro" >&2; exit 1; }
xcrun simctl list devices booted | grep -q Booted || { echo "No booted iOS simulator. Run: cd apps/mobile && npm run ios" >&2; exit 1; }
# Maestro saves recordings under a dated run folder. We copy them to e2e/videos/<name>.mp4 afterwards.
run=$(mktemp -d)
status=0
# LOCKWORDS_METRO=localhost:<port>: the app loads its code from that Metro, not 8081 (one Metro per parallel session).
# The flows are copied and every launchApp gets the RCT_jsLocation launch argument; the files in e2e/ do not change.
# It matches `- launchApp` at the start of a line with no `arguments:` of its own, as every flow writes it today.
src=e2e
if [[ -n "${LOCKWORDS_METRO:-}" ]]; then
  src="$run/e2e"
  mkdir -p "$src" && cp -R e2e/flows e2e/subflows "$src"/
  find "$src/flows" "$src/subflows" -name '*.yaml' -exec perl -0pi -e \
    's/^- launchApp:?\n/- launchApp:\n    arguments:\n      RCT_jsLocation: "$ENV{LOCKWORDS_METRO}"\n/mg' {} +
fi
# Every flow except the ones parked in e2e/quarantine.txt.
flows=()
for f in "$src"/flows/*.yaml; do
  grep -qxF "$(basename "$f")" e2e/quarantine.txt 2>/dev/null && { echo "skipping $(basename "$f") (e2e/quarantine.txt)"; continue; }
  flows+=("$f")
done
maestro ${MAESTRO_DEVICE:+--device "$MAESTRO_DEVICE"} test "${flows[@]}" ${areas:+--include-tags="$areas"} --test-output-dir "$run" || status=$?
mkdir -p e2e/videos
find "$run" -name '*.mp4' -exec cp {} e2e/videos/ \;
rm -rf "$run"
exit $status
