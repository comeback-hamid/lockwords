## Why
The word test in onboarding is a stand-in: Spanish only, no made-up words, always three pages, and a simple sum for the result. Hamid's engine (`docs/vocab-engine.md`) is the tested method and is already live in the funnel. Onboarding must use it, so the number and the level a user sees are ones we can stand behind.

## What Changes
- **Word lists:** the 13 engine word files (en, de, es, pt, ru, fr, it, ar, fa, tr, ja, zh, ko) move into the server. Each page has 20 real words and 3 made-up words. Japanese and Chinese words carry a small reading line.
- **Pages:** A (Basic) and B (Intermediate) always show. C (Advanced) shows only when 4 or more real B words are known. D (Expert) shows only when 15 or more real C words are known. The server decides; the app never learns which words are made up.
- **Scoring:** the model in engine section 1.5, ported as is (slope 1.75, guessing from made-up words, the X_Lex penalty, the rounding rules, "5,000+").
- **Level label:** A1–C2 from engine section 1.6, shown as "About level B1". **BREAKING** for the old labels (`A2+` no longer exists).
- **Guessing:** 3 or more made-up words ticked, and at least 30 % of those shown, gives a "Try again / Show my result" screen once.
- **Result page (O7):** "≈ N" or "5,000+", counts up from 0, the level chip, a short note when a made-up word was ticked, and "You're starting fresh" when no real word was ticked.
- **Saved answers:** every finished test saves its numbers and its ticks (engine section 1.12), so the lists can be tuned later.
- **Maestro videos** for four situations: starting from zero, a beginner, an advanced learner, a guesser.

Not in this change (see design.md): level-matched decks (engine Part 2), and AI word lists for a typed language with no word file. Both need the Anthropic key.

## Decisions I made for you (change any of them before you approve)
1. All 13 languages get the test now. The engine file says some need checks before ads; that is about ads, not about the app.
2. A typed language with no word file skips the test, as today, until the AI key works.
3. The three things with no Figma design (the Expert page, the line "Only tap words you know the meaning of. Some are made up.", the Try again screen) are built in the style of the existing pages. You judge them in the video.
4. The header reads "BASIC WORDS", "INTERMEDIATE WORDS", "ADVANCED WORDS", "EXPERT WORDS". The "1 OF 3" part goes away, because the number of pages is not known at the start.
5. A selected chip keeps the Figma look (green with a check). The engine file says "dark fill, no check". Figma wins unless you say otherwise.
6. The five level options keep their labels. "Brand new" skips the test, as the engine's "Starting from zero" does.
7. The self-rated level is not used for scoring (engine 1.4).

## Old tests this change must rewrite (your approval of this proposal is the permission)
- `apps/server/test/unit/onboarding.test.ts`: the word test and estimate tests (new answer shapes, new numbers).
- `apps/mobile/__tests__/onboarding-screens.test.tsx`: the O4–O7 tests.
- `apps/mobile/__tests__/onboarding-flow.test.ts`: step numbers.
- `e2e/subflows/finish-onboarding.yaml`: the word test steps and the estimate checks.

## Capabilities
### New Capabilities
None.
### Modified Capabilities
- `onboarding/server`: word test lists, the next-page rule, the estimate, the CEFR label, saved test results.
- `onboarding/mobile`: O4–O6 word test (now up to four pages), the Try again screen, O7 result page.

## Impact
- Server: `src/onboarding/word-test.ts` (replaced), new `src/onboarding/vocab/*.json`, new `src/onboarding/estimate.ts`, `src/routes/onboarding.ts`, one new table `word_test_results`, `openapi.json`.
- App: `src/app/onboarding/word-test.tsx`, `estimate.tsx`, new `retry.tsx`, `src/onboarding/store.ts`, `flow.ts`, `src/api/schema.ts`.
- Data licence: the word ranks come from FrequencyWords by Hermit Dave (CC BY-SA 4.0). The credit goes in `README.md` and in the word files. An in-app credit line comes with the settings screen.
- No new packages.
