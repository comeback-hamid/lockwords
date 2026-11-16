# Tasks

## 1. Server

- [x] 1.1 Tests first: unit tests for `applySwipe`, the round order and limit, swipe / hard-words / use-it routes with fake stores and fixtures (incl. other user's card, bad direction, AI fails), the Claude judge with a fake `fetch`; integration test for round → swipes → hard words → use it on the real database. Run them, see them fail.
- [x] 1.2 Build the columns + migration, `srs.ts`, the store, `llm/use-it`, the routes; rewrite `openapi.json`. Server checks green.

## 2. Mobile

- [x] 2.1 Tests first: Jest tests for the Review tab states, the round (flip, the three actions, stamps, save fails, end of round first time and later), Use it (open, example, good, weak, fails), hard words, trial reminder, paywall. Run them, see them fail.
- [x] 2.2 Add `expo-speech`; regenerate API types; client calls; `round-store`, `intro` flag.
- [x] 2.3 Build the Review tab, the round, Use it, the three one-time screens. Mobile checks green.
- [x] 2.4 Maestro flow `e2e/flows/first-run.yaml`, tag `review`: fresh install → onboarding → first round (flip, Use it, Hard, Know it, Easy) → hard words → trial reminder → paywall → tabs → restart. Records `e2e/videos/first-run.mp4`.

## 3. Docs

- [x] 3.1 Update `docs/architecture.md`, `apps/mobile/CLAUDE.md`, `docs/roadmap.md`, `docs/tech-debt.md`, the overnight report.

## Notes from the build
- iOS swipe-back is off on the round screen (it stole the Easy swipe).
- A new card always starts on its front (bug found in the video, fixed with a test).
- Not done: fresh verifier agent, built overnight in one session.
- Not done: a real purchase, a real AI check. See `docs/tech-debt.md`.
