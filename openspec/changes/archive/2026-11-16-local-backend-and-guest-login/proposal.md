# Proposal

## Why

Every feature after this needs a signed-in user and a server that knows who is calling. The cloud accounts (DigitalOcean, Supabase, Apple, Google) are not ready yet. So we build the whole login path on this Mac first, with the same pieces we will use in the cloud. Moving to the cloud later means changing settings only, not code.

Epic: roadmap **0.3 `infra-and-login`**, local half. The cloud half (DigitalOcean deploy, Supabase cloud project, Apple and Google sign-in) is a later change, once Hamid gives the accounts.

## What Changes

- Local Supabase (its own login server, run with the Supabase CLI and Docker) gives guest sign-in on this Mac.
- Server: every `/v1/*` request needs a valid Supabase login token. No token or a bad token → `401`.
- Server: the first call from a new user makes a `users` row. Later calls reuse it.
- Server: new endpoint `GET /v1/me` returns the caller's id, whether they are a guest, and when they joined.
- Server: an OpenAPI document at `GET /openapi.json`, made from the same Zod shapes the server checks. The app's API types are generated from it (the first `src/api/`).
- App: on first open, the app signs in as a guest without showing anything. The session is kept in secure storage, so reopening the app keeps the same user.
- App: after sign-in the app calls `GET /v1/me` once. If the server can't be reached, the app still opens (tabs work); it tries again next open.
- One command starts everything locally: `npm run dev:up` (Supabase + database migrations + server).
- Fix: two rules in `openspec/config.yaml` that OpenSpec could not read (unquoted `: `).

Out of scope:
- Apple, Google and email-code sign-in, and linking a guest to a real account (needs the cloud accounts).
- Any sign-in screen or button. Guests see no login step in v1 onboarding.
- Deploying anything to the cloud.
- Account delete (roadmap epic 9).

Analytics events: none (PostHog is not set up yet).

Figma frames: none. Guest sign-in has no screen.

Easy mode and other languages: nothing changes.

## Capabilities

### New Capabilities
- `account/server`: who the caller is. Token check on `/v1/*`, the `users` table, and `GET /v1/me`.
- `account/mobile`: silent guest sign-in on first open, keeping the session, and the first call to the server.

### Modified Capabilities
(none)

## Impact

- Server: new packages `jose` (checks the login token against Supabase's public keys) and `@hono/zod-openapi` (routes with Zod shapes + OpenAPI). New env values `SUPABASE_URL`, `SUPABASE_JWT_ISSUER`. First Drizzle migration (`users`).
- App: new packages `@supabase/supabase-js`, `expo-secure-store` (native: needs a new dev build), `openapi-fetch`; dev package `openapi-typescript`. New env values `EXPO_PUBLIC_API_URL`, `EXPO_PUBLIC_SUPABASE_URL`, `EXPO_PUBLIC_SUPABASE_ANON_KEY`.
- Dev setup: Docker Desktop must run for local Supabase. New `supabase/` folder (local config only, no secrets).
- CI: integration tests use a fake key pair, not Supabase, so CI needs nothing new.
