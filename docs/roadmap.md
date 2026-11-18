# Roadmap

One epic = a few OpenSpec changes. One change = one branch = one PR (about a day; more than ~10 tasks → split).
Status: ⬜ not started · 🟨 in progress · ✅ done. Order follows the dev guide, section 12.

**Last updated: 2026-11-17 (after PR #15 languages, PR #17 goal and interests, PR #24 New words specs, PR #16 word test; `kai-character` built, PR #18).** Every PR that changes what is done updates this file in the same PR (rule in `AGENTS.md`). `docs/roadmap.html` is made from this file on commit; never edit it by hand.
**v1 target launch: 2026-11-23** (App Store submission + web app). **v1 tabs: New words · Review · Progress.** No Speak in v1 (decided 2026-11-16).

## Where we are (short)
- **Works on the simulator today:** a fresh install → onboarding → Kai chat → first deck → first review round → Use it → hard words → trial reminder → paywall → the three tabs. The app still talks to this Mac (`npm run dev:up`).
- **Live in the cloud (2026-11-17):** the server at `https://lockwords-rhaic.ondigitalocean.app` with its Postgres (DigitalOcean, Frankfurt) and guest login on Supabase cloud (Frankfurt). The Anthropic key is set there, so cloud decks and Use it call the real AI.
- **Not real yet:** the AI (a stand-in makes every deck), the paywall (sells nothing), Kai (still pictures), the app does not point at the cloud server yet.
- **Blocked on Hamid:** accounts and keys still missing: Expo, Apple, RevenueCat, Google, PostHog. (Anthropic, Supabase and DigitalOcean are done.)
- **Done 2026-11-17:** the word test and estimate follow `docs/vocab-engine.md` (#16).
- **In progress (2026-11-17):** the rest of onboarding section 1 in parallel PRs: languages (#15), goal and interests (#17), Kai character / level-matched deck / live Kai chat (#18–#20).

## Phase 0: Setup (days 1–4)

| # | Epic / change | What "done" means | Status |
|---|---|---|---|
| 0.1 | Repo skeleton | AGENTS.md, CLAUDE.md files, OpenSpec, docs, theme tokens from Figma, 3 empty tabs, server `/health`, e2e runner, pre-push hook. All checks green. | ✅ 2026-11-16 |
| 0.2 | Hooks, Ponytail, CI | Claude hooks + plugins in `.claude/settings.json`. GitHub Actions for both apps. Three databases (prod, `lockwords_dev`, `lockwords_test`). | ✅ 2026-11-16 (CI green on PR #1 and #2; the prod database is made in 0.3) |
| 0.3 | `infra-and-login` | DigitalOcean App Platform server + managed Postgres (FRA1) + Spaces. Supabase Auth: guest first, Apple, Google, email code; server checks the token. Dev build on the simulator. | 🟨 local half ✅ 2026-11-16 (`local-backend-and-guest-login`). Cloud half ✅ 2026-11-17 for the server, Postgres, migrations, deploy workflow and guest login on Supabase cloud (`/health` and a guest `/v1/me` answer 200 on the public URL; see "Deploy" in `docs/architecture.md`). Still open: Apple, Google and email-code login (need the Apple and Google accounts), Spaces (not needed yet), and pointing the app at the cloud. |
| 0.4 | `widget-spike` | One word from the server on the iPhone lock screen (SwiftUI WidgetKit via config plugin). **If this fails, everything else waits.** | ✅ tested 2026-11-16, not merged (draft PR #3, `expo-widgets`; notes in `docs/spikes/widget/` on that branch). Real widgets = epic 6. |

## Phase 1: Features in order

| # | Epic | Done | Still open | Figma | Status |
|---|---|---|---|---|---|
| 1 | Onboarding + first deck | `onboarding-profile` (O1–O9) · `onboarding-kai-deck` (O10–O10f: chat parts, deck tables, first deck) · `first-review` (O12–O16) · `deck-background-job` (deck words made by a pg-boss job, 2026-11-17) · `onboarding-languages` (O1–O1c: 13 languages, a typed language checked by the server with Did you mean and a pop-up, O1c blocks the learned language, 2026-11-17) · `onboarding-goal-interests` (O8 Other box as Figma O8b, O9: 20 interests, pick 1–5, old saved interests read clean, 2026-11-17) · `vocab-engine-word-test` (word test and estimate follow `docs/vocab-engine.md`, 13 languages + AI pages for typed ones, 2026-11-17) | level-matched decks (#19) · `kai-character` (🟨 PR #18: live Kai drawn with Skia from the spec in every chat header and on O2; built, waits for Hamid's video OK) · card and deck pictures · Kai's lines in the user's language · "I have an account" on O1 (needs real sign-in) | Onboarding | 🟨 |
| 2 | Review | `first-review`: swipe rules on the server, today's round, card round with stamps, flip, speaker · round picked by the database, speaker language kept after a restart (2026-11-17) | `review-done-streak` (A7, A9) · undo for "I know it" (no design yet) · sounds · pictures | Review | 🟨 |
| 3 | Progress tab | The tab exists with its Figma icon (empty screen, 2026-11-17) | `progress-home` (P1: total, meadow, goal grid, word plan) · `decks-and-words` (P2–P3, swipe delete) | My words | ⬜ |
| 4 | New words tab | The tab exists with its Figma icon (empty screen). Figma N1–N8 updated 2026-11-17 (Kai speaks the learned language with a translation line and an on/off button, no fixed buttons, deck ready → Review dot, Random Words, a normal day). | Specs written 2026-11-17, **waiting for Hamid (checkpoint 1)**: `new-words-kai-chat` (the chat, Kai as an agent with memory, translation; first) · then at the same time `new-words-decks` (deck ideas, own deck, ready → Review) and `new-words-single-words` (word card, Random Words decks) | New words | 🟨 |
| 5 | Use it | `first-review`: Use it chat (A6–A6c), stage +1 on a good sentence | The real AI check (today a stand-in only checks that the word is in the sentence; needs the Anthropic key) | Review | 🟨 |
| 6 | Widgets (full) | Spike passed (0.4) | `lock-widgets` (inline, rectangular, circular; hard words first) · `home-widgets` (medium, small; see + open only in v1) | Widgets | ⬜ |
| 7 | Paywall + trial | `first-review`: the screens (hard words, trial reminder, paywall). **It sells nothing.** | `paywall` (soft: closing = free plan; RevenueCat) · `free-limits` (server) · `sign-in-after-purchase` (the login page comes right after the user subscribes; the Figma login page must be fixed first: it has no top bar and no badge) · needs RevenueCat + Apple accounts | Onboarding | 🟨 |
| 8 | Web app | — | `web-build` (Expo web: same tabs, no widgets) · web payments (provider is open) | all | ⬜ |
| 9 | Launch prep | — | analytics events (PostHog) · account delete · one performance check · real testimonials · App Store submission | — | ⬜ |

## Merged so far
| PR | Date | What |
|---|---|---|
| #1, #2, #4 | 2026-11-16 | Repo setup, CI, fonts |
| #5 | 2026-11-16 | Local backend and guest login |
| #6 | 2026-11-16 | Onboarding O1–O10f, Kai chat, first deck |
| #7 | 2026-11-16 | First review round, Use it, hard words, trial and paywall screens |
| #8 | 2026-11-16 | Old Maestro flows updated; profiles and decks linked to users |
| #9 | 2026-11-17 | Deck background job, review round in the database, speaker language, Figma tab icons |
| #10 | 2026-11-17 | Speak tab → Progress tab |
| #11 | 2026-11-17 | Roadmap brought up to date; rule: every PR keeps it current |
| #12 | 2026-11-17 | V1 docs (product, screens, design, dev guide), HTML copies of the roadmap and product docs |
| #13 | 2026-11-17 | `docs/vocab-engine.md` added (the word test and deck level method) |
| #14 | 2026-11-17 | Cloud: server and Postgres on DigitalOcean, Supabase cloud, deploy workflow |
| #17 | 2026-11-17 | O8 Goal (Other box) and O9 Interests (20, pick 1–5); `e2e.sh` can use another Metro (`LOCKWORDS_METRO`) |
| #21 | 2026-11-17 | `docs/product-review.md` (empty, for Hamid's Review notes); login page noted in the roadmap |
| #15 | 2026-11-17 | O1–O1c: 13 languages, typed language check (`POST /v1/languages/check`), same-language block |
| #16 | 2026-11-17 | Word test and estimate follow the vocabulary engine: 13 languages, made-up words, up to 4 pages, AI pages for a typed language, Try again for guessers. |
| #3 (draft, never merge) | 2026-11-16 | Widget spike |

## Later (not v1)
**Speak tab** (voice talks with Kai: `speak-topics`, `speak-talk`, `speak-summary`; Figma page "Speak" in the old file) · Android + Android widget · answering on the widget · offline review · Easy mode · photo / link / YouTube in the chat box · sharing + web deck maker · the product agent (spec site → Figma check → Q&A box).

## Open decisions (ask Hamid, do not invent)
1. Final app name (Lockwords is the working name).
2. ~~Bundle ID~~ decided 2026-11-16: `com.comebackhamid.lockwords`.
3. ~~Launch languages~~ decided 2026-11-16: every language, content made on demand.
4. Final prices (plan: about $4.99/month or $29.99/year, 7-day trial).
5. Easy on a brand-new card: Stage 1 or Stage 2 (today: Stage 1).
6. Real testimonials and ratings (the paywall shows none until real ones exist).
7. Figma Foundations page still shows the old blue "know" swatch (`#0969da`). The Figma **variable** `signal/know` is `#116329` (green). Theme uses green. Fix the swatch in Figma.
8. Code vocabulary list in `AGENTS.md`: Fatima confirms.
9. In v1 or later: daily reminder push, export to CSV, Recently deleted (30 days), Report this card.
10. Web app payment provider.
11. A standing rule for when an agent may change old tests after an approved spec change.
12. Use it on every card (today) or only from Stage 3.
13. Where card and deck pictures come from.
