# Architecture

Tables and endpoints. Filled in by each change; the server's OpenAPI document is the source for API shapes.

## Services
| Part | Where |
|---|---|
| API server | DigitalOcean App Platform, Frankfurt. App `lockwords`, live at `https://lockwords-rhaic.ondigitalocean.app` (since 2026-11-17). Built from `apps/server/Dockerfile`. Health check `GET /health`; a deploy that fails it for 60 s is rolled back. |
| Database | DigitalOcean Managed Postgres 17, Frankfurt (FRA1). Cluster `lockwords-db`, database `lockwords`. Only the app can reach it (trusted sources). pg-boss jobs in the same database. |
| Files | DigitalOcean Spaces + CDN. Not made yet: nothing stores files today. |
| Login | Supabase Auth only, cloud project `Lockwords` in Frankfurt (`https://sskhsgygvdpnnokvuuyd.supabase.co`). Guest login is on. Apple, Google and email code come when those accounts exist. Server checks the token. |
| Builds, updates | Expo EAS (release builds on GitHub Actions only) |

## Deploy
- **How:** a merge to `main` that touches `apps/server/`, `.do/` or `package-lock.json` runs `.github/workflows/deploy.yml`. It can also be run by hand (Actions → Deploy server → Run workflow).
- **Steps:** the workflow fills `.do/app.yaml` and calls `doctl apps update`. App Platform builds the image, runs the `migrate` job (`npm run db:migrate`, Drizzle), then swaps the server. A failed migration or a failed `/health` stops the deploy and the old server stays.
- **Settings:** all in `.do/app.yaml`. Public values are written there. `DATABASE_URL` and the database's TLS certificate come from App Platform (`${db.DATABASE_URL}`, `${db.CA_CERT}`; `.do/with-db-ca.sh` hands the certificate to Node).
- **Secrets:** GitHub Actions secrets `DIGITALOCEAN_ACCESS_TOKEN` and `ANTHROPIC_API_KEY`. Hamid's copy is `~/.config/lockwords/secrets.env`. Never in git.
- **Cost:** about $20 a month (server $5, database about $15).
- **Point the app at the cloud:** in `apps/mobile/.env.local` set `EXPO_PUBLIC_API_URL=https://lockwords-rhaic.ondigitalocean.app`, `EXPO_PUBLIC_SUPABASE_URL=https://sskhsgygvdpnnokvuuyd.supabase.co` and `EXPO_PUBLIC_SUPABASE_ANON_KEY` = the project's publishable key (Supabase dashboard → Project settings → API keys; Hamid's copy is `SUPABASE_PUBLISHABLE_KEY` in `~/.config/lockwords/secrets.env`). It is a public value, but the secret scan in CI flags it, so it is not written in git.

## Databases
| Name | Used by |
|---|---|
| production (`lockwords` on the `lockwords-db` cluster) | the live server only |
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
| POST | `/v1/decks/{id}/generate` | Starts the background job that makes the 10 cards (pg-boss queue `make-deck`, AI task `make-deck`) and waits up to 20 s. Answers the deck as `ready`, or as `generating` (read it again). `502` if the AI fails; nothing saved. | onboarding-kai-deck |
| GET | `/v1/decks/{id}` | The deck with its cards. Other users get `404`. | onboarding-kai-deck |
| GET | `/v1/review` | Today's round: due cards, then up to 20 new cards. | first-review |
| POST | `/v1/cards/{id}/swipe` | `{ direction: easy / hard / known }` → `{ stage, known, hard, backInDays }`. Rules in `src/review/srs.ts`. | first-review |
| GET | `/v1/hard-words` | Words swiped Hard (for the lock screen). | first-review |
| POST | `/v1/cards/{id}/use-it` | `{ sentence }` → `{ good, lines, movedUp, stage }` (AI task `use-it`). `502` if the AI fails. | first-review |

Every `/v1/*` path needs `Authorization: Bearer <Supabase login token>`. The server checks it against Supabase's public keys (`<SUPABASE_URL>/auth/v1/.well-known/jwks.json`), the issuer, the audience `authenticated` and the expiry. Bad or missing → `401 { error: "unauthorized" }`.

## Tables
| Table | Columns | Added by |
|---|---|---|
| `users` | `id` uuid PK (= Supabase user id), `is_guest` boolean, `created_at` timestamptz | local-backend-and-guest-login |
| `profiles` | `user_id` uuid PK, `learning_language`, `native_language`, `level`, `known_words`, `cefr`, `goal`, `goal_other`, `interests` text[], `updated_at` | onboarding-profile (+ `name`, `chat_language` in onboarding-kai-deck) |
| `decks` | `id` uuid PK, `user_id`, `topic`, `title`, `reason`, `cefr`, `status` (`proposed`/`generating`/`ready`), `created_at` | onboarding-kai-deck |
| `cards` | `id` uuid PK, `deck_id` → `decks.id`, `position`, `word`, `translation`, `example`, `example_translation`, `stage` (0 = new), `due_at`, `known`, `hard`, `created_at` | onboarding-kai-deck, first-review |

## AI
With `ANTHROPIC_API_KEY` set the server calls Claude (`src/llm/claude.ts`). Without it (local, tests, CI) it uses the fixture deck (`src/llm/fixture.ts`).

## Run it all locally (no cloud accounts)
`npm run dev:up` from the repo root: checks Docker → starts local Supabase (login only, `127.0.0.1:54321`) → writes `apps/server/.env` and `apps/mobile/.env.local` if missing → creates the databases → runs migrations → starts the server on `:8787`. Then `cd apps/mobile && npm run ios`.
Going to the cloud later = new values for `SUPABASE_URL`, `SUPABASE_JWT_ISSUER`, `DATABASE_URL` (server) and the three `EXPO_PUBLIC_*` values (app). No code change.
