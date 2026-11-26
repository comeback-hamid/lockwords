#!/usr/bin/env bash
# Run Maestro flows. Usage: npm run e2e [-- --areas review,my-words] [-- --flows word-card,first-run] [-- --platform android]
# The platform is iOS unless `--platform android` or LOCKWORDS_PLATFORM=android says Android (see e2e/README.md, "Android").
set -euo pipefail
cd "$(dirname "$0")/.."
areas=""
only=""
platform=${LOCKWORDS_PLATFORM:-ios}
while [[ $# -gt 0 ]]; do
  case "$1" in
    --areas) areas="$2"; shift 2 ;;
    --platform) platform="$2"; shift 2 ;;
    --flows) only="$2"; shift 2 ;; # flow file names without .yaml, to run a few again after a fix
    *) echo "unknown option: $1" >&2; exit 2 ;;
  esac
done
# Maestro runs `flutter --version` when it starts. On a Mac with Flutter installed and a slow network, that call hangs
# and Maestro never starts (found 2026-11-17). Lockwords has no Flutter, so take Flutter off the PATH for Maestro.
PATH=$(printf '%s' "$PATH" | tr ':' '\n' | grep -v '/flutter/' | paste -sd: -)
export PATH
command -v maestro >/dev/null || { echo "maestro is not installed: brew install mobile-dev-inc/tap/maestro" >&2; exit 1; }
case "$platform" in
  ios) xcrun simctl list devices booted | grep -q Booted || { echo "No booted iOS simulator. Run: cd apps/mobile && npm run ios" >&2; exit 1; } ;;
  android)
    adb=${ANDROID_HOME:-$HOME/Library/Android/sdk}/platform-tools/adb
    # With an iOS simulator booted too, Maestro must be told which device: take the first Android one.
    MAESTRO_DEVICE=${MAESTRO_DEVICE:-$("$adb" devices | awk 'NR>1 && $2=="device" {print $1; exit}')}
    [[ -n "$MAESTRO_DEVICE" ]] || { echo "No running Android emulator or phone. Run: cd apps/mobile && npm run android" >&2; exit 1; }
    ;;
  *) echo "unknown platform: $platform (ios or android)" >&2; exit 2 ;;
esac
# Maestro saves recordings under a dated run folder. We copy them to e2e/videos/<name>.mp4 afterwards.
run=$(mktemp -d)
status=0
# LOCKWORDS_METRO=localhost:<port>: the app loads its code from that Metro, not 8081 (one Metro per parallel session).
# The flows are copied and every launchApp gets the RCT_jsLocation launch argument; the files in e2e/ do not change.
# It matches `- launchApp` at the start of a line with no `arguments:` of its own, as every flow writes it today.
# A flow or subflow that must differ on Android has a twin next to it: `name.android.yaml`. It is never run on iOS.
# On Android the flows are copied and each twin takes the place of `name.yaml`, so a `runFlow: name.yaml` finds it too.
# A flow with only an Android file (no `name.yaml`) runs on Android only.
src="$run/e2e"
mkdir -p "$src" && cp -R e2e/flows e2e/subflows "$src"/
for twin in "$src"/flows/*.android.yaml "$src"/subflows/*.android.yaml; do
  [[ -e "$twin" ]] || continue
  if [[ "$platform" == android ]]; then mv "$twin" "${twin%.android.yaml}.yaml"; else rm "$twin"; fi
done
# Android: the Metro port is part of the debug build (`npx expo run:android --port <port>`), so nothing to rewrite.
# Android: after a data wipe the debug build gets all its code from Metro again, and that takes 10 to 25 seconds on the
# emulator while Maestro watches the screen (measured 2026-11-25). So the wait for the first screen is 60 seconds there.
# Android: `hideKeyboard` is the Back key. With the keyboard already closed, Back leaves the screen (from the Review tab
# it opens the first tab, from the first tab it leaves the app), and a flow goes wrong for no real reason. So on Android
# a flow presses it only while the keyboard is open ("Emoji button" is a key of the Android keyboard).
# The flows name the app by its iPhone ID. Android has its own package (apps/mobile/app.json), so an Android run gets
# that one in its copies of the flows.
if [[ "$platform" == android ]]; then
  ANDROID_APP_ID=$(node -p "require('./apps/mobile/app.json').expo.android.package")
  export ANDROID_APP_ID
  find "$src/flows" "$src/subflows" -name '*.yaml' -exec perl -pi -e 's/^appId: .*$/appId: $ENV{ANDROID_APP_ID}/' {} +
fi
if [[ "$platform" == android ]]; then
  find "$src/flows" "$src/subflows" -name '*.yaml' -exec perl -0pi -e \
    's/(visible: "I\.m Kai, welcome to Lockwords"\n\s+timeout: )15000/${1}60000/g;
     s/^( *)- hideKeyboard[ \t]*$/$1- runFlow:\n$1    when:\n$1      visible: "Emoji button"\n$1    commands:\n$1      - hideKeyboard/mg' {} +
fi
if [[ -n "${LOCKWORDS_METRO:-}" && "$platform" == ios ]]; then
  find "$src/flows" "$src/subflows" -name '*.yaml' -exec perl -0pi -e \
    's/^- launchApp:?\n/- launchApp:\n    arguments:\n      RCT_jsLocation: "$ENV{LOCKWORDS_METRO}"\n/mg' {} +
fi
# Every flow except the ones parked in e2e/quarantine.txt.
# Flows in e2e/slow-pictures.txt check the "drawing the pictures" wait, so they need slow stand-in pictures. Every other
# flow wants the pictures at once. They run last, in a second pass, with the local server's wait set for them only.
flows=()
slow=()
for f in "$src"/flows/*.yaml; do
  name=$(basename "$f")
  [[ -n "$only" && ",$only," != *",${name%.yaml},"* ]] && continue
  grep -qxF "$name" e2e/quarantine.txt 2>/dev/null && { echo "skipping $name (e2e/quarantine.txt)"; continue; }
  [[ "$platform" == android ]] && grep -qxF "$name" e2e/quarantine.android.txt 2>/dev/null && { echo "skipping $name on Android (e2e/quarantine.android.txt)"; continue; }
  if grep -qxF "$name" e2e/slow-pictures.txt 2>/dev/null; then
    # With --areas, keep a slow flow only if one of its tags is asked for (Maestro fails a pass with no flow).
    if [[ -z "$areas" ]] || grep -A4 '^tags:' "$f" | grep -qE "^ *- *($(printf '%s' "$areas" | tr ',' '|')) *$"; then slow+=("$f"); fi
    continue
  fi
  flows+=("$f")
done
if [[ ${#flows[@]} -gt 0 ]]; then
  maestro ${MAESTRO_DEVICE:+--device "$MAESTRO_DEVICE"} test "${flows[@]}" ${areas:+--include-tags="$areas"} --test-output-dir "$run" || status=$?
fi
if [[ ${#slow[@]} -gt 0 ]]; then
  # The server's address: LOCKWORDS_API, or the one the app uses (apps/mobile/.env.local), or the default local port.
  api=${LOCKWORDS_API:-$(sed -n 's/^EXPO_PUBLIC_API_URL=//p' apps/mobile/.env.local 2>/dev/null | head -1)}
  api=${api:-http://localhost:8787}
  wait_ms() { curl -fsS -m 10 -X POST -H 'Content-Type: application/json' -d "{\"ms\":$1}" "$api/dev/fixture-picture-ms" >/dev/null; }
  # Android: Maestro needs about 3 seconds per step there, so the flow gets a longer wait to look at.
  slow_ms=30000; [[ "$platform" == android ]] && slow_ms=75000
  if wait_ms "${LOCKWORDS_SLOW_PICTURE_MS:-$slow_ms}"; then
    maestro ${MAESTRO_DEVICE:+--device "$MAESTRO_DEVICE"} test "${slow[@]}" --test-output-dir "$run/slow" || status=$?
    wait_ms 0 || echo "could not put the stand-in picture wait back to 0 on $api" >&2
  else
    echo "The server at $api has no stand-in picture wait to set (it runs with a real image key, or it is not the local stack)." >&2
    echo "Not run: ${slow[*]##*/}" >&2
    status=1
  fi
fi
# iOS videos: e2e/videos/. Android videos: e2e/videos/android/ (the same names, so they must not land on each other).
videos=e2e/videos
[[ "$platform" == android ]] && videos=e2e/videos/android
mkdir -p "$videos"
find "$run" -name '*.mp4' -exec cp {} "$videos"/ \;
# LOCKWORDS_E2E_KEEP=<folder>: keep Maestro's own output (screenshots of failed steps, logs) there, to read after a run.
if [[ -n "${LOCKWORDS_E2E_KEEP:-}" ]]; then rm -rf "$LOCKWORDS_E2E_KEEP" && mkdir -p "$LOCKWORDS_E2E_KEEP" && cp -R "$run"/. "$LOCKWORDS_E2E_KEEP"/; fi
rm -rf "$run"
exit $status
