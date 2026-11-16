# Roadmap

One epic = a few OpenSpec changes. One change = one branch = one PR (about a day; more than ~10 tasks → split).
Status: ⬜ not started · 🟨 in progress · ✅ done. Order follows the dev guide, section 12. The riskiest part (the widget) comes first among features.

## Phase 0: Setup (days 1–4)

| # | Epic / change | What "done" means | Status |
|---|---|---|---|
| 0.1 | Repo skeleton | AGENTS.md, CLAUDE.md files, OpenSpec, docs, theme tokens from Figma, 3 empty tabs, server `/health`, e2e runner, pre-push hook. All checks green. | ✅ 2026-11-16 |
| 0.2 | Hooks, Ponytail, CI | Claude hooks + plugins in `.claude/settings.json`. GitHub Actions for both apps. Three databases (prod, `lockwords_dev`, `lockwords_test`). | ✅ 2026-11-16 (CI green on PR #1 and #2; the prod database is made in 0.3) |
| 0.3 | `infra-and-login` | DigitalOcean App Platform server + managed Postgres (FRA1) + Spaces. Supabase Auth: guest first, Apple, Google, email code; server checks the token. Dev build on the simulator. | 🟨 local half ✅ 2026-11-16 (`local-backend-and-guest-login`: guest login + token check + `/v1/me`, all on this Mac). Cloud half (DigitalOcean, Supabase cloud, Apple, Google) needs Hamid's accounts. |
| 0.4 | `widget-spike` | One word from the server on the iPhone lock screen (SwiftUI WidgetKit via config plugin). **If this fails, everything else waits.** | ✅ tested 2026-11-16, not merged (draft PR #3, `expo-widgets`; notes in `docs/spikes/widget/` on that branch). Real widgets = epic 6. |

## Phase 1: Features in order (then daily)

| # | Epic | Changes (one PR each, names are drafts) | Figma | Status |
|---|---|---|---|---|
| 1 | Onboarding + first deck | ✅ `onboarding-profile` (O1–O9, 2026-11-16) · ✅ `onboarding-kai-deck` (O10–O10f: chat parts, deck tables, `make-deck` AI task with a fixture, 2026-11-16) · ✅ `first-review` (O12–O16 as the first Review round + one-time screens, 2026-11-16) · still open: animated Kai, card pictures · `kai-character` (Skia renderer from the spec) · `kai-chat-ui` (Kai header, bubbles, reply options, composer) · `deck-generation` (server: make_deck, checks, pictures) · `onboarding-kai-deck` (O10–O10f) · `onboarding-practice-use-it` (O12–O14) | Onboarding | ⬜ |
| 2 | Review | 🟨 core done in `first-review` (swipe rules, round, stamps). Open: streak A7, undo, sounds, pictures · `srs-core` (server: stages, due list, new-word queue, swipes) · `review-cards` (A2–A5c, stamps, flip, sound) · `review-done-streak` (A7, A9) | Review | ⬜ |
| 3 | My words | `my-words-home` (M1: total, meadow, goal grid, word plan) · `decks-and-words` (M2–M3, swipe delete, Recently deleted 30 days) | My words | ⬜ |
| 4 | New words tab | `new-words-chat` (N1–N4: 3 ready decks, Create) · `own-deck-and-how-do-i-say` (N5–N7) | New words | ⬜ |
| 5 | Use it | 🟨 done in `first-review` with a stand-in checker (needs the AI key) · `use-it` (A6–A6c: Kai chat, thumbs up, feedback, stage +1 on a good sentence) | Review | ⬜ |
| 6 | Widgets (full) | `lock-widgets` (inline, rectangular, circular; hard words first) · `home-widgets` (medium, small; App Intents buttons) | Widgets | ⬜ |
| 7 | Speak | `speak-topics` (SP1–SP2) · `speak-talk` (SP3–SP5, WebRTC, short-lived key, transcript) · `speak-summary` (SP6) · Speak test layers 1→3 | Speak | ⬜ |
| 8 | Paywall + trial | `paywall` (O15–O16, RevenueCat, test store with no key) · `free-limits` (server) | Onboarding | ⬜ |
| 9 | Launch prep | analytics events (PostHog) · account delete · export CSV · one performance check · real testimonials · native-speaker voice check | — | ⬜ |

## Later (not v1)
Offline review · Android widget · Easy mode · photo / link / YouTube in the chat box · sharing + web deck maker · the product agent (spec site → Figma check → Q&A box).

## Open decisions (ask Hamid, do not invent)
From `docs/product.md` section 9, plus what came up while setting up the repo:
1. Final app name (Lockwords is the working name).
2. ~~Bundle ID~~ decided 2026-11-16: `com.comebackhamid.lockwords` (Hamid OK).
3. Launch languages (suggested: Japanese, Korean, Spanish, Quranic Arabic).
4. Final prices and free limits (current plan: Pro $6.99/month or $39.99/year, 7-day trial).
5. Easy on a brand-new card: Stage 1 or Stage 2.
6. Speak typing mode and more talk animations (designed only in part).
7. Real testimonials and ratings (all current ones are placeholders).
8. Figma Foundations page still shows the old blue "know" swatch (`#0969da`). The Figma **variable** `signal/know` is `#116329` (green), same as `product.md`. Theme uses green. Fix the swatch in Figma.
9. Code vocabulary list in `AGENTS.md`: Fatima confirms.
