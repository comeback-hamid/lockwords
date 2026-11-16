# Architecture

Tables and endpoints. Filled in by each change; the server's OpenAPI document is the source for API shapes.

## Services
| Part | Where |
|---|---|
| API server | DigitalOcean App Platform (deploy from GitHub; health check `GET /health`, rollback after 60 s of failures) |
| Database | DigitalOcean Managed Postgres, Frankfurt (FRA1). pg-boss jobs in the same database. |
| Files | DigitalOcean Spaces + CDN |
| Login | Supabase Auth only (guest, Apple, Google, email code). Server checks the token. |
| Builds, updates | Expo EAS (release builds on GitHub Actions only) |

## Databases
| Name | Used by |
|---|---|
| production | the live server only |
| `lockwords_dev` | local server, for the app |
| `lockwords_test` | integration tests (wiped each run; name must contain "test") |

## Endpoints
| Method | Path | What | Added by |
|---|---|---|---|
| GET | `/health` | `{ ok: true }` | repo skeleton |
| GET | `/openapi.json` | OpenAPI 3.1 document, made from the server's Zod shapes. Saved as `apps/server/openapi.json` (`npm run openapi`); the app's types come from it (`npm run api:gen` in `apps/mobile`). | local-backend-and-guest-login |
| GET | `/v1/me` | `{ id, isGuest, createdAt }`. Makes the user row on the first call. | local-backend-and-guest-login |

Every `/v1/*` path needs `Authorization: Bearer <Supabase login token>`. The server checks it against Supabase's public keys (`<SUPABASE_URL>/auth/v1/.well-known/jwks.json`), the issuer, the audience `authenticated` and the expiry. Bad or missing → `401 { error: "unauthorized" }`.

## Tables
| Table | Columns | Added by |
|---|---|---|
| `users` | `id` uuid PK (= Supabase user id), `is_guest` boolean, `created_at` timestamptz | local-backend-and-guest-login |

## Run it all locally (no cloud accounts)
`npm run dev:up` from the repo root: checks Docker → starts local Supabase (login only, `127.0.0.1:54321`) → writes `apps/server/.env` and `apps/mobile/.env.local` if missing → creates the databases → runs migrations → starts the server on `:8787`. Then `cd apps/mobile && npm run ios`.
Going to the cloud later = new values for `SUPABASE_URL`, `SUPABASE_JWT_ISSUER`, `DATABASE_URL` (server) and the three `EXPO_PUBLIC_*` values (app). No code change.
