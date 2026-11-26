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
- **Secrets:** GitHub Actions secrets `DIGITALOCEAN_ACCESS_TOKEN` and `ANTHROPIC_API_KEY`, and `OPENAI_API_KEY` for deck pictures (optional: without it the deploy leaves it out and decks have no pictures). Hamid's copy is `~/.config/lockwords/secrets.env`. Never in git.
- **Cost:** about $20 a month (server $5, database about $15).
- **The app and the cloud:** the app talks to the cloud by default (`apps/mobile/src/config/backend.ts` holds the server address, the Supabase address and the publishable key, which is public). The local stack is used only when `apps/mobile/.env.local` sets the three `EXPO_PUBLIC_*` values, as `npm run dev:up` does; Maestro and day-to-day development run that way. `npm run start:cloud` in `apps/mobile` runs the dev build against the cloud.

## Web app
- **What:** the same Expo app built for a browser (`web-build`, 2026-11-20). One page app (`web.output: single` in `apps/mobile/app.json`), static files only.
- **Run it locally:** `npm run dev:up`, then `npm run web` in `apps/mobile` (it reads `.env.local`, so it talks to the local stack).
- **Build it:** `npx expo export -p web` in `apps/mobile` writes `dist/`. With no `EXPO_PUBLIC_*` values it talks to the cloud server. CI builds it on every pull request.
- **Browser calls (CORS):** the server allows the addresses in `WEB_ORIGINS` (comma list; in the cloud it comes from the GitHub Actions variable `WEB_ORIGINS` through `.do/app.yaml`, and is left out while that variable is empty) and any localhost port. Headers: `Authorization`, `Content-Type`, `X-Time-Zone`.
- **Differences from the phone:** session and small flags in `localStorage` (`src/platform/key-store.ts`); browser dialogs (`src/platform/dialog.ts`); a plain tab bar at the bottom (`(tabs)/_layout.web.tsx`); Kai and the meadow drawn on the browser's own 2D canvas, moving as on the phone (`kai-canvas.web.tsx`, `meadow-canvas.web.tsx`; no Skia in the browser, its web build is a 2.9 MB download); no widgets; the layout follows the window (`src/platform/web-layout.ts`: phone under 600 px, one column from 600, a side bar from 1024; `WebFrame` and `(tabs)/_layout.web.tsx`); page-wide browser rules in `src/platform/page-style.ts`; the page itself, the manifest and the home screen icons in `apps/mobile/public/`.
- **Public since 2026-11-25 (Hamid's yes, the free DigitalOcean address): https://lockwords-web-vdovu.ondigitalocean.app** . The first DigitalOcean build worked on the first run. The server allows this address (GitHub Actions variable `WEB_ORIGINS`). The link is listed nowhere. How it is set up and updated:
  - **Where:** DigitalOcean App Platform, a static site in its own app `lockwords-web` (`.do/web.yaml`). Chosen because the account, the token and the deploy tooling already exist (no new account), static sites cost nothing there, it serves `index.html` for every path, and it is a separate app, so it cannot touch the server or the phone app.
  - **How it was done (and how to do it again for another address):** (1) `gh workflow run "Deploy web app"` (add `-f domain=app.example.com` for Hamid's own address). The run creates the app, checks that `/` and a deep link answer, and prints the address. (2) `gh variable set WEB_ORIGINS --body "https://<that address>"` (several addresses: comma separated), then `gh workflow run "Deploy server"`: the server then allows the web app's browser calls. Until step 2 the page opens but cannot talk to the server.
  - **An own domain** also needs one DNS record at the domain's seller (a CNAME to the DigitalOcean address; App Platform shows it and makes the certificate).
  - **Updates are by hand:** a merge to `main` does NOT update the web app. After a merge that changes the app, run `gh workflow run "Deploy web app"` (about 4 minutes).
  - **Know this:** the cloud server uses the real AI keys and a web page is open to anyone, and there are no free limits yet (roadmap epic 7). Each visitor who makes a deck costs real money (words: Anthropic; pictures: OpenAI).

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
| GET | `/v1/word-test?language=` | `{ supported, madeUp, pages: { A, B, C, D } }`: the onboarding word test (`docs/vocab-engine.md`). Words only, order fixed per user. 13 word files; a typed language gets an AI pack (A, B, C) once. | vocab-engine-word-test |
| POST | `/v1/word-test/next` | `{ language, known }` → `{ next: "C" \| "D" \| null }`: the server decides the next page. | vocab-engine-word-test |
| POST | `/v1/word-test/estimate` | `{ language, known }` → `{ words, outOf: 5000, plus, cefr, startingFresh, reliable, fakesTicked }`; saves a `word_test_results` row. | vocab-engine-word-test |
| PUT | `/v1/profile` | Saves the onboarding answers (one row per user). | onboarding-profile |
| PUT | `/v1/profile/chat` | `{ name, chatLanguage }` from the Kai chat. `409` with no profile. | onboarding-kai-deck |
| GET | `/v1/kai/script?native=&learning=` | Kai's onboarding lines and tap answers in both languages (`{ native, learning }`, key → line). English is built in (`src/kai/script.ts`); another language is translated once by the AI and kept in `kai_scripts`. A failed or incomplete translation gives English. | onboarding-kai-language |
| GET | `/v1/deck-ideas` | Four first-deck topics for the user's goal. | onboarding-kai-deck |
| POST | `/v1/decks` | `{ topic }` → a proposed deck (title, level, reason; no cards). | onboarding-kai-deck |
| POST | `/v1/decks/{id}/generate` | Starts the background job that makes the 10 cards (pg-boss queue `make-deck`, AI task `make-deck`) and waits up to 20 s. Answers the deck as `ready`, or as `generating` (read it again). `502` if the AI fails; nothing saved. | onboarding-kai-deck |
| GET | `/v1/decks/{id}` | The deck with its cards (a card has `hard: true` or `known: true` when it is). Other users get `404`. | onboarding-kai-deck |
| DELETE | `/v1/decks/{id}` | Removes the deck and its cards → `204`. `404` for another user's, an unknown or a removed deck; `409 deck_generating` while its words are being made. | remove-words-and-decks |
| DELETE | `/v1/cards/{id}` | Removes one card → `204` (`404` like above). The deck's `wordCount` follows. | remove-words-and-decks |
| GET | `/v1/review` | (`?deckId=` = only that deck, same rules.) Today's round: cards due this review day, then every new card (no daily limit since 2026-11-24). Each card has `canUseIt` (always true since 2026-11-25). A review day starts at 04:00 in the caller's time zone (header `X-Time-Zone`, sent by the app on every call; missing = UTC; `src/review/day.ts`). | first-review, review-srs-rules |
| POST | `/v1/cards/{id}/swipe` | `{ direction: easy / hard / known }` → `{ stage, known, hard, backInDays, again }`. `again` is always false since 2026-11-24 (a Hard card no longer comes back the same day). `409 not_due` when the card is not in today's round (also a double send). Rules in `src/review/srs.ts`. Each swipe saves a `review_events` row. | first-review, review-srs-rules |
| GET | `/v1/progress` | The Progress tab's numbers: `{ total, new, learning, mastered, decks, goal, masterBy, grid, language, trees, future }` (`future` = the page in 90 days at the pace of the last week: `{ by, total, new, learning, mastered, grid, moreDecks }`) (`trees` = per deck, oldest first, the levels of its met words: the meadow). Counted in `src/progress/numbers.ts` (mastered = stage 5 or known; goal = next hundred above the words to learn; date = pace of the last 7 days + 24 days). | progress-server |
| GET | `/v1/decks` | The learner's ready decks, newest first: `{ id, topic, title, kind, words, learning, hard, stages }`. | progress-server |
| GET | `/v1/plan` | **Unused since 2026-11-23** (the word plan left the Progress tab; can be removed later). The word plan: `{ goal, items: [{ topic, words, kind }] }`, up to three next deck ideas the learner has no deck for. Made by the AI task `plan-decks`, kept in `deck_plans`; made again when fewer than three are left or after 7 days. Empty with no profile or when the AI fails and nothing is kept. | word-plan |
| POST | `/v1/cards/{id}/restore` | Brings back a word marked "I know it" → `{ id, stage, known: false }`. `409 not_known`, `404`. | progress-server |
| GET | `/v1/hard-words` | Words swiped Hard (for the lock screen). | first-review |
| POST | `/v1/review/undo` | Takes back the caller's newest swipe of today (the card gets its `before` state, the event is marked undone) → `{ card }`. `409 nothing_to_undo` with none today or right after an undo. | review-round-screens |
| GET | `/v1/review/summary` | `{ day, name, streakDays, today: { words, minutes, easy, hard, known, stages } }`. Streak = review days in a row with a swipe. Minutes = gaps between swipes, each cut at 60 s. Rules in `src/review/summary.ts`. | review-round-screens |
| POST | `/v1/cards/{id}/use-it` | `{ sentence }` → `{ good, lines, followUp, movedUp, stage }` (AI task `use-it`). A good sentence counts like an Easy swipe, once per card per review day, for a card of today's round that offers Use it (history kind `use_it`). `502` if the AI fails. | first-review, use-it-rules |
| POST | `/v1/cards/{id}/ask` | `{ question, sentence? }` → `{ lines }` (1 to 3): Kai answers a question about the word (AI task `ask-word`). Never changes the card. `502 ask_failed` if the AI fails. | use-it-rules |
| GET | `/v1/kai/use-it-script` | `{ nativeLanguage, lines: { key: { text, translation? } } }`: Kai's fixed lines of the Use it chat in the language Kai speaks with this learner, with a translation in their own language when that is the learned language. | use-it-translation |
| POST | `/v1/transcribe` | `{ audio (base64), format }` → `{ text }`: the mic in the chat box. OpenAI `gpt-transcribe`, told the learner's two languages (from the profile) as the expected ones; a third language heard = one more try in the learner's own language. The sound is not saved. `502 transcribe_failed` if the AI fails. | voice-input |
| GET | `/v1/kai/chat` | The New words chat: `{ messages, options, translationOn, nativeLanguage }` (newest 50 messages, oldest first; `hasMore: true` when older ones are left). With `?before=<message id>`: the 50 before that message, no options. | new-words-kai-chat |
| POST | `/v1/kai/chat/turns` | `{ text }` (the learner speaks) or `{ open: true }` (Kai opens, at most once in 12 hours) → `{ userMessage, messages, options, action }` (AI task `kai-chat`). `409` no profile, `429` over 200 messages in 24 h, `502` if the AI fails (nothing saved). | new-words-kai-chat |
| PUT | `/v1/kai/chat/translation` | `{ on }`: the learner's choice for the translation line. | new-words-kai-chat |

Every `/v1/*` path needs `Authorization: Bearer <Supabase login token>`. The server checks it against Supabase's public keys (`<SUPABASE_URL>/auth/v1/.well-known/jwks.json`), the issuer, the audience `authenticated` and the expiry. Bad or missing → `401 { error: "unauthorized" }`.

## Tables
| Table | Columns | Added by |
|---|---|---|
| `users` | `id` uuid PK (= Supabase user id), `is_guest` boolean, `created_at` timestamptz | local-backend-and-guest-login |
| `profiles` | `user_id` uuid PK, `learning_language`, `native_language`, `level`, `known_words`, `cefr`, `goal`, `goal_other`, `interests` text[], `updated_at` | onboarding-profile (+ `name`, `chat_language` in onboarding-kai-deck) |
| `decks` | `id` uuid PK, `user_id`, `topic`, `title`, `reason`, `cefr`, `status` (`proposed`/`generating`/`ready`), `created_at` | onboarding-kai-deck |
| `cards` | `id` uuid PK, `deck_id` → `decks.id`, `position`, `word`, `translation`, `example`, `example_translation`, `meaning` (a short definition in the learned language, top deck band only; null = show the translation), `stage` (0 = new), `due_at`, `known`, `hard`, `created_at` | onboarding-kai-deck, first-review |
| `review_events` | `id` uuid PK, `user_id` → `users.id`, `card_id` → `cards.id`, `kind` (`easy` / `hard` / `known` / `use_it`), `review_day` date, `before` and `after` (the card's stage, known, hard, due time as JSON), `undone_at`, `created_at`. The review history: daily new-word limit, streak, today's numbers and undo read it. | review-srs-rules |
| `kai_scripts` | `language` PK (trimmed, lower case), `lines` (JSON, key → line), `created_at`. Kai's onboarding script per language, translated once. | onboarding-kai-language |
| `deck_plans` | `user_id` PK → `users.id`, `items` (JSON), `created_at`. The learner's word plan. | word-plan |
| `decks`, `cards` | `removed_at` timestamptz (empty = not removed). **Removing is a mark, never a delete:** chat messages point at decks, and "no lost cards" is a product rule. Every query that reads cards or decks adds "not removed" (`db/decks.ts`, `db/cards.ts`, `db/kai.ts`, `decks/random-words.ts`): a new reader must do the same. | remove-words-and-decks |
| `kai_messages` | `id` uuid PK, `user_id`, `role` (`kai`/`user`), `text`, `translation` (Kai's lines), `options` text[] (on Kai's last line of a turn), `opening`, `position` (order inside a turn), `created_at` | new-words-kai-chat (also `cards.last_reviewed_at` and `profiles.kai_translation_on`) |
| `kai_notes` | `id` uuid PK, `user_id`, `text`, `created_at`. What Kai remembers about a learner. At most 50 per user. | new-words-kai-chat |

## AI
With `ANTHROPIC_API_KEY` set the server calls Claude (`src/llm/claude.ts`). Without it (local, tests, CI) it uses the fixture deck (`src/llm/fixture.ts`).

### Deck pictures
Every deck gets a picture for each word, right after its words, in the same background job. One image call draws all the words as a grid on **one sheet** (OpenAI Images API, 1536 × 1024, medium quality, the style of `docs/design/ILLUSTRATION-STYLE.md`); the server cuts the sheet into one WebP per card (`src/decks/cut-sheet.ts`: the cut lines go through the empty gaps) and keeps them in the `card_pictures` table. `GET /pictures/{id}` serves a picture with no login (the id is random) and a one-year cache. A card's `imageUrl` in the API is that address; it is left out when the card has no picture. The deck says how far the pictures are: `picturesStatus` (`none`, `making`, `ready`, `failed`) and `picturesReady`. A failed image call never loses the deck: the words are saved first, the status becomes `failed`, and the cards have no picture.
With `OPENAI_API_KEY` set the server calls the image model. Without it: no pictures in production; a stand-in sheet of plain shapes in local runs and tests. Try it for real: `npx tsx scripts/deck-pictures-try.ts 30` in `apps/server` (2026-11-23: 22 to 28 seconds per sheet for 10 or 30 words).

### Kai, the agent in the New words chat
One model call per turn (`src/llm/kai-chat.ts`, real call in `claude.ts`: Claude Sonnet 5.5, low effort, no thinking, two tries of 10 seconds). The answer is JSON: `{ lines: [{ text, translation }], options, remember, action }`, checked with Zod in `src/kai/chat.ts`; a wrong shape is asked for once more.

What Kai knows on every turn (its memory), built in `src/kai/chat.ts`:
- **The profile:** name, both languages, CEFR level, known-words estimate, goal, interests.
- **Notes** (`kai_notes`): short sentences Kai saved when the learner said something new about themselves (the `remember` field). New ones only, newest 50 kept.
- **History:** the newest 20 messages. Older ones stay in the table for the screen.
- **Word facts:** how many words, how many reviewed in the last 24 hours (`cards.last_reviewed_at`), how many due, and up to 10 of their words (hard first).

Rules live in the prompt (`buildKaiPrompt`): write at the learner's level in the learning language, give every line a translation, switch to the native language only when asked, help only with language learning, never ask for the goal.
New abilities (deck ideas, word cards) add an optional field to the answer and one file in `src/kai/abilities/`. `abilities/index.ts` lists them; `buildKaiPrompt` and the answer shape read that list (rules, facts, the JSON shape, and what Kai is asked to do in this turn).

**Word cards** (`src/kai/abilities/words.ts`): when the learner asks how to say something or what a word means, the answer carries `word: { word, translation, example, exampleTranslation }`. It is saved with Kai's last line of the turn (`kai_messages.word`). A message then shows the word plus `addTo` (the Random Words deck that would take it now), `added` and `already`. A word with a missing field fails the whole answer.
**Random Words decks** (`src/decks/random-words.ts`): `POST /v1/kai/chat/messages/{id}/add-word` adds the word as a normal new card to the newest deck of `kind: "random"` with fewer than 30 cards, or makes "Random Words N+1". One transaction with a per-user lock; the result is kept on the message, so a second call gives the same answer. A word the learner already has in any deck (capital letters ignored) is not added (`already: true`).
**Pictures for single words** (`src/decks/word-pictures.ts`, 2026-11-25): the add-word route starts a pg-boss job for the new card and does not wait. The job draws one small image for that card (OpenAI image model, 1024 × 1024, low quality, about 13 s), cuts it to 5 : 4 and saves a 512 × 410 WebP as the card's picture. A failed picture keeps the word. Older words with no picture: `npx tsx scripts/word-pictures-backfill.ts` counts them, and with `--run --limit N` queues one job per deck (queue `word-pictures-backfill`); that job draws a deck's missing words on one sheet, like a generated deck.
Check real word cards by hand with `npx tsx scripts/kai-words-try.ts` (20 turns, Spanish and Persian).

**Decks in the chat** (`src/kai/abilities/decks.ts`, change `new-words-decks`):
- Kai's answer may carry `decks`: 3 ideas (Kai's own) or 1 (the learner's own idea). Each has `topic`, `title` (learning language), `titleTranslation`, `reason` and `wordCount` (10 to 30, Kai picks it). Any other number is a wrong answer.
- The server saves each idea as a `proposed` deck and links them to Kai's last line of the turn (`kai_messages.deck_ids`). A chat message then has `decks` (left out when it has none), each with the deck's status now and `current` (true for the newest line that has decks). The app shows them as deck cards; older ideas show grayed.
- Generate is the same deck job as in onboarding. It makes exactly `wordCount` cards (`decks.word_count`).
- When the deck is ready the app sends a turn with `{ event: "deck_ready", deckId }`. Kai says the deck is ready, once per deck (`kai_messages.ready_deck_id`); a second event answers with no messages. Not ready is 409, not the caller's deck is 404.
- What Kai is told: new words left (stage 0), the topics of the learner's decks and of ideas not made, and the offer rules (ask first on the first visit; offer when asked or with fewer than 10 new words left; never repeat a topic; at most one question for an own deck).
- The Review tab's red dot is a flag on the phone (`apps/mobile/src/review/dot.ts`).
Check real idea sets by hand with `npx tsx scripts/kai-decks-try.ts`.
Check real answers by hand with `npx tsx scripts/kai-try.ts` in `apps/server` (20 turns in 5 languages; needs `ANTHROPIC_API_KEY`).

## Run it all locally (no cloud accounts)
`npm run dev:up` from the repo root: checks Docker → starts local Supabase (login only, `127.0.0.1:54321`) → writes `apps/server/.env` and `apps/mobile/.env.local` if missing → creates the databases → runs migrations → starts the server on `:8787`. Then `cd apps/mobile && npm run ios`.
Going to the cloud later = new values for `SUPABASE_URL`, `SUPABASE_JWT_ISSUER`, `DATABASE_URL` (server) and the three `EXPO_PUBLIC_*` values (app). No code change.

## Widgets (iOS)
The widget shows the learner's hard words (`docs/product.md` 7.4). What iOS allows: `docs/widget-limits.md`.

```
server                        app                          widget (its own small program)
GET /v1/widget/plan   →   src/widgets/sync.ts     →   src/widgets/lockwords-widget.tsx
 (words, order, looks)     updateTimeline(entries)       draws the entry of the current time
```
- **The server decides.** `src/widget/plan.ts` makes the slots (30 minutes each, 07:00 to 23:00, 48 hours ahead) and keeps what it handed out in `widget_plans`. iOS cannot say whether a person looked, so on the next call every kept slot whose end has passed counts as one look.
- **The app carries.** It loads the plan when it starts and when it comes back to the front, and gives it to the widget through the app group (`expo-widgets`). The widget cannot call the server.
- **Pictures.** The plan's slots also carry `example` and `imageUrl`. The widget cannot load from the network, so the app saves each word picture (WebP, as the server sends it) and Kai's poses as files in the shared folder (`src/widgets/pictures.ts`, `kai-files.ts`) and deletes the pictures of words that left the plan.
- **The widget draws.** One layout file, four sizes: inline and rectangular on the lock screen, small and medium on the home screen (light, dark, tinted). One timeline entry = one word, its meaning, the look (1 to 5) and the file of Kai's pose. After the last slot comes one "Open Lockwords" entry.
- **A tap** opens `lockwords://review?first=<card id>`; the Review tab asks `GET /v1/review?first=` and starts the round on that word.
- Not built: a refresh while the app is closed (the plan lasts 48 hours), and knowing whether the learner added the widget.



### The Android home screen widget
Android phones have no lock screen widgets, so Android gets the home screen widget only. The same server plan, another last step:
```
server                        app                               widget (native code in the app)
GET /v1/widget/plan   →   src/widgets/sync.android.ts   →   modules/lockwords-widget (Kotlin)
 (words, order, looks)     setEntries(JSON)                    keeps the entries, draws the one for "now"
```
- **Why our own native code:** `expo-widgets` on Android (SDK 58) cannot open the app from a tap and has no timed entries (read from its source, 2026-11-25). The widget is a local Expo module (`apps/mobile/modules/lockwords-widget`): Expo links it by itself, and its own `AndroidManifest.xml` adds the widget to the app. The generated `android/` folder is not edited.
- **The app carries** the same entries as on iOS (`toTimeline`), as JSON: when, the word, its meaning, the look, the example, where a tap goes. Kai's poses are pictures inside the widget (`npm run widget:kai` writes them for both platforms).
- **The widget draws without the app.** It keeps the entries on the phone, shows the newest one that has started, and wakes itself at the start of the next one (an alarm that may be 2 minutes late; Android also wakes it every 30 minutes). After the last slot it says "Open Lockwords".
- **A tap** opens `lockwords://review?first=<card id>`, as on iOS.
- **Checks:** Jest for the app side and for the native files that must match (colors, Kai's pictures, allowed views); the Maestro flow `home-widget.android.yaml` reads the address back from the widget's own code. The widget's look on a home screen was checked by eye on the emulator.
