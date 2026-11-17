## 1. Server
- [ ] 1.1 Copy the 13 word files into `src/onboarding/vocab/` (keep the licence line); failing data tests (integer k, 20 + 3 per page, readings for ja and zh)
- [ ] 1.2 Failing tests from the engine: the 1.8 table, the invariants, the CEFR gate, the next-page rule
- [ ] 1.3 Port the scoring code to `src/onboarding/estimate.ts` until 1.2 passes
- [ ] 1.4 Routes: new `GET /v1/word-test` shape with per-user order and no fake flag, `POST /v1/word-test/next`, new estimate answer; rewrite the old route tests listed in the proposal
- [ ] 1.5 Table `word_test_results` + save on every estimate (integration test)
- [ ] 1.6 Port the recovery run as `npm run test:engine`, add it to CI

## 2. App
- [ ] 2.1 Regenerate the API types; rewrite the O4–O7 tests listed in the proposal so they fail
- [ ] 2.2 Word test pages: four bands, the "Some are made up" line, readings, server-driven next page, "See all words ↓"
- [ ] 2.3 Try again screen and the new result page (count up, "5,000+", "About level X", starting fresh, made-up note)

## 3. Check
- [ ] 3.1 Maestro: update the shared onboarding steps; four recorded flows (zero, beginner, advanced, guesser)
- [ ] 3.2 All checks green; credit line in `README.md`; `docs/roadmap.md`, `docs/architecture.md` and both `CLAUDE.md` files updated
