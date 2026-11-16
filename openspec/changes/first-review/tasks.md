# Tasks

## 1. Server

- [ ] 1.1 Tests first: unit tests for `applySwipe`, the round order and limit, swipe / hard-words / use-it routes with fake stores and fixtures (incl. other user's card, bad direction, AI fails), the Claude judge with a fake `fetch`; integration test for round → swipes → hard words → use it on the real database. Run them, see them fail.
- [ ] 1.2 Build the columns + migration, `srs.ts`, the store, `llm/use-it`, the routes; rewrite `openapi.json`. Server checks green.

## 2. Mobile

- [ ] 2.1 Tests first: Jest tests for the Review tab states, the round (flip, the three actions, stamps, save fails, end of round first time and later), Use it (open, example, good, weak, fails), hard words, trial reminder, paywall. Run them, see them fail.
- [ ] 2.2 Add `expo-speech`; regenerate API types; client calls; `round-store`, `intro` flag.
- [ ] 2.3 Build the Review tab, the round, Use it, the three one-time screens. Mobile checks green.
- [ ] 2.4 Maestro flow `e2e/flows/first-run.yaml`, tag `review`: fresh install → onboarding → first round (flip, Use it, Hard, Know it, Easy) → hard words → trial reminder → paywall → tabs → restart. Records `e2e/videos/first-run.mp4`.

## 3. Docs

- [ ] 3.1 Update `docs/architecture.md`, `apps/mobile/CLAUDE.md`, `docs/roadmap.md`, `docs/tech-debt.md`, the overnight report.
