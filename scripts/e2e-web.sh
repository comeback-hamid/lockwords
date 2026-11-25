#!/usr/bin/env bash
# The web app in real browsers (Playwright): Chromium, Firefox and WebKit (Safari's engine), phone-size window.
# Usage: npm run e2e:web [-- --project=chromium] [-- --headed]
# Needs the local stack (npm run dev:up) with the stand-in AI: start the server without OPENAI_API_KEY and
# ANTHROPIC_API_KEY. First time on a Mac: npx playwright install chromium firefox webkit
set -euo pipefail
cd "$(dirname "$0")/.."
[[ -f apps/mobile/.env.local ]] || { echo "apps/mobile/.env.local is missing. Run: npm run dev:up" >&2; exit 1; }
api=${LOCKWORDS_API:-$(sed -n 's/^EXPO_PUBLIC_API_URL=//p' apps/mobile/.env.local)}
curl --fail --silent --max-time 5 "$api/health" >/dev/null || { echo "The local server does not answer at $api. Run: npm run dev:up" >&2; exit 1; }
port=${LOCKWORDS_WEB_PORT:-8799}
# The built files, as a host would serve them (not the dev server): this is what goes online.
npm run build:web
node scripts/serve-web.mjs apps/mobile/dist "$port" &
server=$!
trap 'kill $server 2>/dev/null || true' EXIT
for _ in $(seq 1 20); do curl --fail --silent "http://localhost:$port/" >/dev/null && break; sleep 0.5; done
LOCKWORDS_WEB_URL="http://localhost:$port" npx playwright test -c e2e/web "$@"
