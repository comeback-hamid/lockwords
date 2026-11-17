## Context
`docs/vocab-engine.md` is the source. Its code block (section 1.5) is the live funnel code and has no dependencies. The word files are 60 KB in total. Today the server owns the word test and the estimate; that stays.

## Goals / Non-Goals
**Goals:** the same result as the funnel for the same answers; the app never knows which words are made up; every answer saved for tuning.
**Non-Goals:** level-matched decks (engine Part 2, part d); the typed-language check (part a); Kai's animation (part d); the Phase 2 ideas in engine 1.12.

## Decisions
- **Port, do not rewrite.** `estimate.ts` is the engine's code in TypeScript, same constants, same order of steps. The engine's test table (1.8) is the proof.
- **The server hides the fakes.** `GET /v1/word-test` sends `{ w, rd? }` only: no rank, no fake flag. So the app cannot decide the next page itself. `POST /v1/word-test/next` takes the ticks so far and answers which page comes next (`C`, `D` or none). The estimate call works out the shown pages again from the same ticks, so the app cannot send a wrong page list.
- **Shuffle per user.** Word order on a page is seeded by the user id, so a reload keeps the order (engine 1.2).
- **Redo is counted in the app.** The server always answers `reliable: true/false`. The app shows the Try again screen only the first time; after a second unreliable try it shows the number (engine 1.5, step 10).
- **Typed language → AI word pack.** `GET /v1/word-test` for a language with no file asks the word-pack task (Claude Sonnet, fixture in tests) for 20 words in each of 3 bands (1–1,000, 1,000–2,500, 2,500–5,000 most common lemmas), stores them in `word_packs` by language name, and scores them with engine `packVocab()` (A → k 173, B → 1,581, C → 3,536). Same pages for every user of that language. If the AI call fails, the answer is `supported: false` and the user skips the test, so onboarding never blocks.
- **One new table** `word_test_results` (user, language, version, numbers, ticks as text). Written by the estimate call. Add-only migration.
- **Step numbers.** The top bar stays "n/10": the pages take steps 3 to 6 (A, B, C, D), the result is step 7. Skipped pages jump the number forward, as "Brand new" already does.
- **Seeing all words.** The page scrolls. When some chips are below the screen, the main button reads "See all words ↓" and scrolls down first (engine 1.4, step 6).
- **Tests to port:** data checks, the 1.8 result table, the invariants (300 random answer sets per language), and the recovery run, as server unit tests. The recovery run takes about 40 s, so it runs in its own script (`npm run test:engine`) and in CI.

## Risks / Trade-offs
- An AI word pack can hold a wrong or very rare word → the scorer only counts ticks per page, so one bad word moves the result little; packs can be deleted and made again.
- Korean reads about one level low (engine limit 2) → shown as is; noted in the roadmap.
- The Maestro "advanced" run taps about 70 words → slow (about 3 minutes), but it is the only way to show page D.

## Migration Plan
Add the table. Old profiles keep their saved `knownWords` and `cefr`; nothing is recomputed. Rollback = revert the PR (the table can stay).

## Open Questions
None. Hamid answered them on 2026-11-17.
