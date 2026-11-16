# Tasks

## 1. Server

- [x] 1.1 Tests first: unit tests for the auth middleware with a test ES256 key pair (no token, bad signature, expired, wrong issuer, good guest token, good non-guest token, token never in logs) and for `GET /openapi.json` listing `/v1/me`. Run them, see them fail.
- [x] 1.2 Tests first: integration tests on `lockwords_test` for `GET /v1/me` (first call makes the row, second call reuses it, two calls at once give one row). Run them, see them fail.
- [x] 1.3 Add `jose` and `@hono/zod-openapi`; add `SUPABASE_URL` and `SUPABASE_JWT_ISSUER` to `env.ts` and `.env.example`.
- [x] 1.4 Build the auth middleware on `/v1/*` (key set passed in; JWKS from `SUPABASE_URL` in the real server) and the `users` table + first Drizzle migration.
- [x] 1.5 Build `GET /v1/me` and `GET /openapi.json`; add `npm run openapi` that writes `apps/server/openapi.json`, plus a test that the checked-in file matches. All server tests, typecheck and lint green.

## 2. Mobile

- [x] 2.1 Tests first: Jest tests for the session store (fresh install clears `SECURE_KEYS`, reopen keeps the session), guest sign-in (signs in only when there is no session; failure shows nothing) and the `/v1/me` call (sends the bearer token; server down shows nothing). Run them, see them fail.
- [x] 2.2 `npx expo install @supabase/supabase-js expo-secure-store expo-file-system openapi-fetch`; dev `openapi-typescript`. Generate `src/api/schema.ts` from `apps/server/openapi.json`.
- [x] 2.3 Build `src/auth/` (Supabase client with the SecureStore adapter, `SECURE_KEYS`, fresh-install clear, `ensureGuest()`) and `src/api/client.ts`; call them from the root layout without blocking. All mobile tests, typecheck and lint green.
- [x] 2.4 Maestro flow `e2e/flows/guest-login.yaml`, tag `onboarding`: fresh install → tabs show → debug line shows a user id → restart → same id. Records `e2e/videos/local-backend-and-guest-login.mp4`. Not done in this change: a visible debug line in release builds, it shows only in dev builds.

## 3. Docs

- [x] 3.1 `supabase/` folder (`supabase init`, anonymous sign-in on, signing key path, key file git-ignored) and `npm run dev:up` (Docker check → `supabase start` → write local `.env` files if missing → migrate → server). Update `docs/architecture.md` (users table, `/v1/me`, local setup), `apps/server/CLAUDE.md`, `apps/mobile/CLAUDE.md`, README "Run it locally".

## Notes from the build
- `openapi-typescript` is run with `npx` (`npm run api:gen`), not installed: it does not accept TypeScript 6 as a peer yet.
- Maestro 2.11 only records inside its own run folder, so `scripts/e2e.sh` copies videos to `e2e/videos/<name>.mp4`.
- The session is saved in SecureStore in 1,800-character pieces (a Supabase session can pass SecureStore's ~2 KB advice).
- Not done: fresh verifier agent (`/opsx:verify`, `/code-review`), built overnight in one session; Hamid checks the video and the diff in the morning.
