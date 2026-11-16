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
| GET | `/v1/word-test?language=` | `{ supported, bands[3] }`: the onboarding word test. Seeded for Spanish only. | onboarding-profile |
| POST | `/v1/word-test/estimate` | `{ language, known[] }` → `{ knownWords, outOf: 5000, cefr }` | onboarding-profile |
| PUT | `/v1/profile` | Saves the onboarding answers (one row per user). | onboarding-profile |
| PUT | `/v1/profile/chat` | `{ name, chatLanguage }` from the Kai chat. `409` with no profile. | onboarding-kai-deck |
| GET | `/v1/deck-ideas` | Four first-deck topics for the user's goal. | onboarding-kai-deck |
| POST | `/v1/decks` | `{ topic }` → a proposed deck (title, level, reason; no cards). | onboarding-kai-deck |
| POST | `/v1/decks/{id}/generate` | Makes the 10 cards (AI task `make-deck`). `502` if the AI fails; nothing saved. | onboarding-kai-deck |
| GET | `/v1/decks/{id}` | The deck with its cards. Other users get `404`. | onboarding-kai-deck |

Every `/v1/*` path needs `Authorization: Bearer <Supabase login token>`. The server checks it against Supabase's public keys (`<SUPABASE_URL>/auth/v1/.well-known/jwks.json`), the issuer, the audience `authenticated` and the expiry. Bad or missing → `401 { error: "unauthorized" }`.

## Tables
| Table | Columns | Added by |
|---|---|---|
| `users` | `id` uuid PK (= Supabase user id), `is_guest` boolean, `created_at` timestamptz | local-backend-and-guest-login |
| `profiles` | `user_id` uuid PK, `learning_language`, `native_language`, `level`, `known_words`, `cefr`, `goal`, `goal_other`, `interests` text[], `updated_at` | onboarding-profile (+ `name`, `chat_language` in onboarding-kai-deck) |
| `decks` | `id` uuid PK, `user_id`, `topic`, `title`, `reason`, `cefr`, `status` (`proposed`/`ready`), `created_at` | onboarding-kai-deck |
| `cards` | `id` uuid PK, `deck_id` → `decks.id`, `position`, `word`, `translation`, `example`, `example_translation`, `stage` (0 = new), `created_at` | onboarding-kai-deck |

## AI
With `ANTHROPIC_API_KEY` set the server calls Claude (`src/llm/claude.ts`). Without it (local, tests, CI) it uses the fixture deck (`src/llm/fixture.ts`).

## Run it all locally (no cloud accounts)
`npm run dev:up` from the repo root: checks Docker → starts local Supabase (login only, `127.0.0.1:54321`) → writes `apps/server/.env` and `apps/mobile/.env.local` if missing → creates the databases → runs migrations → starts the server on `:8787`. Then `cd apps/mobile && npm run ios`.
Going to the cloud later = new values for `SUPABASE_URL`, `SUPABASE_JWT_ISSUER`, `DATABASE_URL` (server) and the three `EXPO_PUBLIC_*` values (app). No code change.
