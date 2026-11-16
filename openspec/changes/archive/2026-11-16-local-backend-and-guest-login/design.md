# Design

## Context

See proposal.md for why. Today the server has only `/health`, an empty Drizzle schema and no migrations. The app has three placeholder tabs and loads fonts. No API client exists yet. Postgres 14 runs on this Mac (`lockwords_dev`, `lockwords_test`). Docker Desktop and the Supabase CLI 3.2 are installed.

## Goals / Non-Goals

**Goals:**
- The local setup works the same way as the cloud setup, so going live is only new env values.
- Tests in CI need no Supabase and no network.

**Non-Goals:**
- Real sign-in providers, account linking, sign-in UI, cloud deploy.

## Decisions

### 1. Local Supabase for login only, our own Postgres for data
`supabase start` runs Supabase's login server (GoTrue) in Docker on `localhost:54321`. Our data stays in our own Postgres (`lockwords_dev`), as in the cloud plan (DigitalOcean Postgres + Supabase for login only).
- Other option: fake the login server ourselves. Rejected: then the first real test of login would be in the cloud.
- Supabase's Docker Postgres is used only by Supabase itself. We never write to it.

### 2. Check tokens with Supabase's public keys (JWKS), not a shared secret
Supabase cloud projects sign tokens with an asymmetric key and publish the public keys at `<SUPABASE_URL>/auth/v1/.well-known/jwks.json`. Local Supabase does the same once it has a signing key: `supabase gen signing-key` makes one, and `supabase/config.toml` points to it (`[auth] signing_keys_path`). The key file is private, so it is git-ignored and made by `npm run dev:up` if missing.
The server uses `jose`: `createRemoteJWKSet(<jwks url>)` + `jwtVerify(token, keys, { issuer, audience: 'authenticated' })`. Keys are cached by `jose`.
- Other option: HS256 with the project's JWT secret. Rejected: the server would hold a secret that can make tokens, and Supabase is moving away from it.

### 3. Tests make their own key pair
The auth middleware takes the key set as a parameter. Unit and integration tests make an ES256 key pair with `jose`, sign their own tokens (good, expired, wrong issuer, wrong key) and pass a local key set. No Supabase in tests or CI.

### 4. Users table and "create on first call"
```
users
  id          uuid primary key      -- = Supabase user id (token "sub")
  is_guest    boolean not null      -- from token "is_anonymous", updated on each call
  created_at  timestamptz not null default now()
```
`INSERT ... ON CONFLICT (id) DO UPDATE SET is_guest = excluded.is_guest RETURNING *`. One statement, so two first calls at once still give one row. Migration made with `drizzle-kit generate` (add-only).

### 5. Routes with Zod + OpenAPI
`@hono/zod-openapi` defines `/v1/me` with Zod answer shapes and serves `/openapi.json` from them. The mobile app generates `src/api/schema.ts` with `openapi-typescript` from a checked-in `apps/server/openapi.json` (written by a server script), and calls the API with `openapi-fetch`. A test fails if the checked-in file differs from what the server makes, so app types never drift.
- Other option: share TypeScript types directly between apps. Rejected: AGENTS.md says API shapes follow the OpenAPI document, and the web app and future clients need it too.

### 6. App session storage
`@supabase/supabase-js` with `auth.storage` = an `expo-secure-store` adapter, `autoRefreshToken: true`, `persistSession: true`, `detectSessionInUrl: false`. The Supabase storage key goes in one `SECURE_KEYS` list. On a fresh install (iOS Keychain survives app delete), the app clears every key in `SECURE_KEYS` first. "Fresh install" = a marker file in the app's document folder (deleted with the app) is missing; the app writes it after clearing. `expo-file-system` is used for the marker.
Sign-in runs in the root layout after fonts, never blocks rendering, and swallows errors (spec: no error shown).

### 7. Env values
| Where | Name | Local value |
|---|---|---|
| server | `SUPABASE_URL` | `http://127.0.0.1:54321` |
| server | `SUPABASE_JWT_ISSUER` | `http://127.0.0.1:54321/auth/v1` |
| app | `EXPO_PUBLIC_SUPABASE_URL` | `http://127.0.0.1:54321` |
| app | `EXPO_PUBLIC_SUPABASE_ANON_KEY` | from `supabase status` (public, not a secret) |
| app | `EXPO_PUBLIC_API_URL` | `http://127.0.0.1:8787` |
`npm run dev:up` writes the local `.env` files from `supabase status -o env` if missing. The `.env.example` files list every name.

## Risks / Trade-offs

- **Docker is heavy** (several GB, uses memory). Only needed when running the app locally, not for tests.
- **iOS simulator only.** A real phone can't reach `127.0.0.1` on the Mac. Fine until the cloud change.
- **SecureStore size:** a Supabase session is about 1–2 KB. iOS Keychain has no small limit, so this is fine on iOS. Android (later) may need a split store.
- **Local and cloud Supabase may differ** in small ways (issuer URL format). The issuer is an env value, and the cloud change will add one integration check against the real project.
- **Anonymous sign-in abuse** (bots making many guests): Supabase rate limits it. Captcha is a cloud-change question.
