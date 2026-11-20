# Roadmap

One epic = a few OpenSpec changes. One change = one branch = one PR (about a day; more than ~10 tasks → split).
Status: ⬜ not started · 🟨 in progress · ✅ done. Order follows the dev guide, section 12.

**Last updated: 2026-11-20 (Hamid decided: no free limits and no deck pictures for now, see `docs/tech-debt.md`; before it PR #29 New words polish: Kai's states, right-to-left text and older messages in the New words chat; before it PR #28 Remove words and decks).** Every PR that changes what is done updates this file in the same PR (rule in `AGENTS.md`). `docs/roadmap.html` is made from this file on commit; never edit it by hand.
**v1 target launch: 2026-11-23** (App Store submission + web app). **v1 tabs: New words · Review · Progress.** No Speak in v1 (decided 2026-11-16).

## Where we are (short)
- **Works on the simulator today:** a fresh install → onboarding → Kai chat → first deck → first review round → Use it → hard words → trial reminder → paywall → the three tabs → New words: a chat with Kai on the real AI (2026-11-17); ask Kai how to say something, get a word card, add it to "Random Words 1" and find it in Review (2026-11-19); Kai offers 3 deck ideas or takes the learner's own idea, Generate makes a deck of 10 to 30 words, the Review tab gets a red dot (2026-11-19); on the deck page, swipe a word left to delete it, or remove the whole deck (2026-11-19). The app talks to the cloud by default since 2026-11-19; development and Maestro use the local stack (`npm run dev:up`).
- **Live in the cloud (2026-11-17):** the server at `https://lockwords-rhaic.ondigitalocean.app` with its Postgres (DigitalOcean, Frankfurt) and guest login on Supabase cloud (Frankfurt). The Anthropic key is set there, so cloud decks and Use it call the real AI.
- **Not real yet:** the paywall (sells nothing). The AI is real in the cloud; the local stack with no key uses a stand-in.
- **Blocked on Hamid:** accounts and keys still missing: Expo, Apple, RevenueCat, Google, PostHog. (Anthropic, Supabase and DigitalOcean are done.)
- **Done 2026-11-17:** the word test and estimate follow `docs/vocab-engine.md` (#16); live Kai in every chat header and on O2 (#18); Kai types with dots in every chat, talking back to Kai, Kai's state follows the chat (#20); the first deck matches the learner's level (#19).
- **Next to build without accounts:** the Progress tab (epic 3). The New words tab (epic 4) is built: chat, single words, decks.

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
| 1 | Onboarding + first deck | `onboarding-profile` (O1–O9) · `onboarding-kai-deck` (O10–O10f: chat parts, deck tables, first deck) · `first-review` (O12–O16) · `deck-background-job` (deck words made by a pg-boss job, 2026-11-17) · `onboarding-languages` (O1–O1c: 13 languages, a typed language checked by the server with Did you mean and a pop-up, O1c blocks the learned language, 2026-11-17) · `onboarding-goal-interests` (O8 Other box as Figma O8b, O9: 20 interests, pick 1–5, old saved interests read clean, 2026-11-17) · `vocab-engine-word-test` (word test and estimate follow `docs/vocab-engine.md`, 13 languages + AI pages for typed ones, 2026-11-17) · `kai-character` (live Kai drawn with Skia from the spec in every chat header and on O2, 2026-11-17) · `kai-chat-live` (Kai types with dots in every chat, talk back to Kai (`POST /v1/kai/reply`), Kai's state follows the chat, a tapped option rises, timed deck count, 2026-11-18) · `level-matched-deck` (first-deck words follow vocab-engine Part 2: band from level + word test, mix and size, Sonnet 5.5, one retry on a fast failure, 2026-11-18) | card and deck pictures · Kai's lines in the user's language · "I have an account" on O1 (needs real sign-in) | Onboarding | 🟨 |
| 2 | Review | `first-review`: swipe rules on the server, today's round, card round with stamps, flip, speaker · round picked by the database, speaker language kept after a restart (2026-11-17) | `review-done-streak` (A7, A9) · undo for "I know it" (no design yet) · sounds · pictures | Review | 🟨 |
| 3 | Progress tab | The tab exists with its Figma icon (empty screen, 2026-11-17) | `progress-home` (P1: total, meadow, goal grid, word plan) · `decks-and-words` (P2–P3; swipe delete and Remove deck are built on the deck page, 2026-11-19: the deck list is still open) | My words | ⬜ |
| 4 | New words tab | `new-words-kai-chat` (2026-11-17): the tab is one ongoing chat with Kai. Kai is an agent with memory (profile, saved notes, the last 20 messages, word facts) on the real AI. Every Kai line has a translation, with an on/off button (on for A1/A2). Kai leads to Review. Figma N1–N8 updated. · `new-words-single-words` (2026-11-19): Kai answers "How do I say…?" and "What does … mean?" with a word card (word, speaker, meaning, example); "Add to Random Words 1" saves it as a normal new card in a deck of 30 made by the server (then "Random Words 2"); a word the learner already has is not added twice; the Review tab gets a red dot. · `new-words-decks` (2026-11-19): Kai offers 3 deck ideas as cards the learner swipes (on the first visit Kai asks first), or 1 card from the learner's own idea; each deck has its own size (10 to 30 words, Kai picks it) and a title in the learning language with a translation; Generate makes it, it is in the word list at once, Kai says so, the Review tab gets a red dot; then "Let's practice" or "Make another deck". · `remove-words-and-decks` (2026-11-19): on the deck page the learner swipes a word left and taps Delete, or taps Remove deck (a pop-up asks first); removed words leave Review, the hard words and what Kai knows; removing is a mark in the database, not a delete; a Random Words deck that lost a word has room again. · `new-words-polish` (2026-11-19): Kai's header follows the chat (listening, thinking, speaking, making, celebrate, oops, waiting after 20 quiet seconds, sleeping after 2 minutes); a tapped option moves up; Persian and Arabic text is right-aligned (each text by its own script: bubbles, translations, the composer, word and deck cards); scrolling to the top loads older messages, 50 at a time. | Free limits (Hamid, 2026-11-20: none for now, decided after the whole app is built, with epic 7) · deck pictures (Hamid, 2026-11-20: none for now) · the deck page N7 (it still shows the English topic as its heading) · the chat's line queue still uses its own typing rule, not `useKaiTyping` (its tests check that rule's times; see `new-words-polish`, tasks.md) · new Kai drawings for "asking", "I don't know" and "happy" (needs a design). | New words | ✅ 2026-11-19 (the three changes) |
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
| #18 | 2026-11-17 | Live Kai: a Skia port of the character (`src/kai/`), in every chat header and waving on O2; pauses on hidden screens; Reduce Motion = still |
| #20 | 2026-11-18 | Live Kai chat: typing dots before every Kai bubble in every chat, talk back to Kai (`POST /v1/kai/reply`), Kai's state follows the chat |
| #19 | 2026-11-18 | Level-matched first deck: band from level + word test (vocab-engine Part 2), deck prompt with mix and size, Sonnet 5.5, word checks, one retry on a fast failure |
| #25 | 2026-11-19 | New words tab: one ongoing chat with Kai, an agent with memory on the real AI (`POST /v1/kai/chat/turns`); a translation under every Kai line with an on/off button; Kai leads to Review |
| #26 | 2026-11-19 | Single words: Kai's word card in the chat, "Add to Random Words N" (`POST /v1/kai/chat/messages/{id}/add-word`), decks of `kind: random` with 30 words, the red dot on the Review tab |
| #27 | 2026-11-19 | New words decks: deck ideas on Kai's answer (3, or 1 for the learner's own idea), deck cards in the chat, a deck's own size (10 to 30) and title translation, the `deck_ready` event, the Review dot |
| #28 | 2026-11-19 | Remove words and decks: swipe a word left and Delete on the deck page, Remove deck with a pop-up (`DELETE /v1/cards/{id}`, `DELETE /v1/decks/{id}`); removing is a `removed_at` mark; Review, hard words, Random Words and Kai skip removed rows |
| #29 | 2026-11-19 | New words polish: Kai's states on the New words chat, a tapped option moves up, right-to-left text in every chat part, older messages (`GET /v1/kai/chat?before=`) |
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
