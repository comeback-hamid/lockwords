#!/usr/bin/env bash
# Start everything the app needs on this Mac: local Supabase (login), database tables, our server.
# Usage: npm run dev:up        Stop Supabase later with: npx supabase stop  (or: supabase stop)
set -euo pipefail
cd "$(dirname "$0")/.."

docker info >/dev/null 2>&1 || { echo "Docker is not running. Open Docker Desktop, then run this again." >&2; exit 1; }
command -v supabase >/dev/null || { echo "Supabase CLI missing: brew install supabase/tap/supabase" >&2; exit 1; }

# The local signing key is private to this Mac (git-ignored). Make it once.
if [[ ! -s supabase/signing_keys.json ]]; then
  echo '[]' > supabase/signing_keys.json
  yes | supabase gen signing-key --algorithm ES256 >/dev/null
fi

# Login only: we skip the Supabase parts we do not use.
supabase start -x studio,realtime,storage-api,imgproxy,edge-runtime,logflare,vector,postgres-meta,supavisor,mailpit

if [[ ! -f apps/mobile/.env.local ]]; then
  anon=$(supabase status -o env 2>/dev/null | sed -n 's/^ANON_KEY="\(.*\)"$/\1/p')
  sed "s|^EXPO_PUBLIC_SUPABASE_ANON_KEY=.*|EXPO_PUBLIC_SUPABASE_ANON_KEY=$anon|" apps/mobile/.env.example > apps/mobile/.env.local
  echo "wrote apps/mobile/.env.local"
fi
[[ -f apps/server/.env ]] || { cp apps/server/.env.example apps/server/.env; echo "wrote apps/server/.env"; }

bash scripts/db-setup.sh
set -a; source apps/server/.env; set +a
npm run db:migrate -w @lockwords/server
exec npm run dev -w @lockwords/server
