# Tasks

## 1. Server

- [x] 1.1 Tests first: unit tests for deck ideas, `PUT /v1/profile/chat`, propose / generate / read with fake stores and the fixture maker (incl. no profile, bad topic, generate twice, AI fails, other user's deck), and for `claudeDeckMaker` with a fake `fetch`. Integration test: propose → generate → read on the real database. Run them, see them fail.
- [x] 1.2 Build tables + migration, stores, `llm/` (interface, fixture, Claude), routes; rewrite `openapi.json`. Server tests, typecheck, lint green.

## 2. Mobile

- [x] 2.1 Tests first: Jest tests for `kai-script` lines, the chat parts (bubble bold, reply options, composer, deck card states), the Kai chat screen through all steps (incl. failures), the deck page (loading, error, list), and the changed O9 ending. Run them, see them fail.
- [x] 2.2 Regenerate API types; add client calls. Build `src/components/chat/` (KaiHeader, ChatBubble, ReplyOptions, Composer, DeckCard).
- [x] 2.3 Build the Kai chat screen, the deck page, and move the "finished" mark. Mobile tests, typecheck, lint green.
- [x] 2.4 Extend the Maestro flow `onboarding-profile.yaml` (not on main yet) into the full path O1 → O10f → Review tab → restart. Tag `onboarding`. Records `e2e/videos/onboarding.mp4`.

## 3. Docs

- [x] 3.1 Update `docs/architecture.md`, `apps/server/src/llm/README.md`, `apps/mobile/CLAUDE.md`, `docs/roadmap.md`, `docs/tech-debt.md`.

## Notes from the build
- The flow file is now `e2e/flows/onboarding.yaml` (whole path O1 → O10f → Review → restart).
- Kai's lines appear at once, not one by one.
- Not done: fresh verifier agent, built overnight in one session.
- Not done: a try against the real Claude API (no working key, blocked from Iran without a VPN).
- See `docs/tech-debt.md` for the shortcuts.
