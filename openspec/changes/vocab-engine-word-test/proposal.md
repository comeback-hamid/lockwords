## Why
The word test in onboarding is a stand-in: Spanish only, no made-up words, always three pages, and a simple sum for the result. Hamid's engine (`docs/vocab-engine.md`) is the tested method and is already live in the funnel. Onboarding must use it for every language, so the number and the level a user sees are ones we can stand behind.

Source of the decisions: Hamid's walkthrough of O1–O10f on 2026-11-17 (`~/research/lockscreen-words/lockwords/spec-walkthrough/section-1-notes.md`) and his "OK" to my suggested answers.

## What Changes
- **Word lists:** the 13 engine word files (en, de, es, pt, ru, fr, it, ar, fa, tr, ja, zh, ko) move into the server. Each page has 20 real words and 3 made-up words. Japanese and Chinese words carry a small reading line.
- **A typed language** (Other on O1, already checked by part a) gets a word test made by AI, as engine section 1.3 says: 3 pages of 20 words each (Basic, Intermediate, Advanced), no made-up words, each word given its band's middle rank. Made once per language and kept, so the next user of that language gets the same pages at once.
- **Pages:** A (Basic) and B (Intermediate) always show. C (Advanced) shows only when 4 or more real B words are known. D (Expert) shows only when 15 or more real C words are known. So most users see 2 or 3 pages, a few see 4. The server decides; the app never learns which words are made up.
- **Selected words:** a tapped word only turns green. No check mark (it makes chips wider and messy). Figma is changed to match.
- **Scoring:** the model in engine section 1.5, ported as is (slope 1.75, guessing from made-up words, the X_Lex penalty, the rounding rules, "5,000+").
- **Level label:** A1–C2 from engine section 1.6, shown as "About level B1". **BREAKING** for the old labels (`A2+` no longer exists).
- **Guessing:** 3 or more made-up words ticked, and at least 30 % of those shown, gives a "Try again / Show my result" screen once.
- **Result page (O7):** "≈ N" or "5,000+", counting up from 0, Kai celebrating, the level chip, a short note when a made-up word was ticked, and "You're starting fresh" when no real word was ticked.
- **Saved answers:** every finished test saves its numbers and its ticks (engine section 1.12), so the lists can be tuned later.
- **Figma:** the chip change on O4–O6, plus new frames for the Expert page, the Try again screen, the "Some are made up" line and the starting-fresh result.
- **Maestro videos** for four situations: starting from zero (no test), a beginner, an advanced learner (all 4 pages), a guesser (Try again).

Not in this change: level-matched decks (engine Part 2, part d), the language lists and the typed-language check (part a), Kai's animation (part d; this change only shows Kai in the celebrate pose).

## Decisions (approved by Hamid on 2026-11-17)
1. All 13 languages get the test now.
2. Up to 4 pages, following the engine. A typed language gets 3.
3. Screens with no Figma design are added to Figma V1 by me, in the style of the existing pages.
4. The page header reads "BASIC WORDS", "INTERMEDIATE WORDS", "ADVANCED WORDS", "EXPERT WORDS". The "1 OF 3" part goes away, because the number of pages is not known at the start.
5. A selected word only turns green, with no check mark.
6. The five level options keep their labels. "Brand new" skips the test, as the engine's "Starting from zero" does. The self-rated level is not used for scoring (engine 1.4).

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
- Server: `src/onboarding/word-test.ts` (replaced), new `src/onboarding/vocab/*.json`, new `src/onboarding/estimate.ts`, new LLM task `src/llm/word-pack.ts` (fixture + Claude), `src/routes/onboarding.ts`, two new tables `word_test_results` and `word_packs`, `openapi.json`.
- App: `src/app/onboarding/word-test.tsx`, `estimate.tsx`, new `retry.tsx`, `src/onboarding/store.ts`, `flow.ts`, `src/api/schema.ts`.
- Data licence: the word ranks come from FrequencyWords by Hermit Dave (CC BY-SA 4.0). The credit goes in `README.md` and in the word files. An in-app credit line comes with the settings screen.
- No new packages.
- Runs in parallel with parts a, c and d (separate sessions). Shared files are kept to small edits.
