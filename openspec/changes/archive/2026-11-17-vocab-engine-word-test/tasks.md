## 1. Server
- [x] 1.1 Copy the 13 word files into `src/onboarding/vocab/` (keep the licence line); failing data tests (integer k, 20 + 3 per page, readings for ja and zh)
- [x] 1.2 Failing tests from the engine: the 1.8 table, the invariants, the CEFR gate, the next-page rule
- [x] 1.3 Port the scoring code to `src/onboarding/estimate.ts` until 1.2 passes
- [x] 1.4 Routes: new `GET /v1/word-test` shape with per-user order and no fake flag, `POST /v1/word-test/next`, new estimate answer; rewrite the old route tests listed in the proposal
- [x] 1.5 Tables `word_test_results` and `word_packs`; save on every estimate (integration test)
- [x] 1.6 Typed language: word-pack LLM task (fixture + Claude), stored and reused; `packVocab` scoring; failing tests first
- [x] 1.7 Port the recovery run as `npm run test:engine`, add it to CI

## 2. App
- [x] 2.1 Regenerate the API types; rewrite the O4–O7 tests listed in the proposal so they fail
- [x] 2.2 Word test pages (green chip, no check mark): four bands, the "Some are made up" line, readings, server-driven next page, "See all words ↓"
- [x] 2.3 Try again screen and the new result page (count up, "5,000+", "About level X", starting fresh, made-up note)

## 3. Figma
- [x] 3.1 Chip change on O4–O6; new frames: Expert page, Try again screen, "Some are made up" line, starting-fresh result

## 4. Check
- [x] 4.1 Maestro: update the shared onboarding steps; four recorded flows (zero, beginner, advanced, guesser)
- [x] 4.2 All checks green; credit line in `README.md`; `docs/roadmap.md`, `docs/architecture.md` and both `CLAUDE.md` files updated
