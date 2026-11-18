## 1. Server
- [x] 1.1 Tests first: `test/unit/deck-band.test.ts` (the band table above), `test/unit/deck-prompt.test.ts` (advanced and zero-level prompts), and new cases in a new `test/unit/deck-checks.test.ts` (duplicates, asterisks, too few, fast-failure retry, slow failure no retry). Run them, see them fail.
- [x] 1.2 `src/decks/band.ts`: `deckBand`, level map, band texts, mix text, measured size. Check: deck-band tests pass.
- [x] 1.3 `src/llm/make-deck.ts`: new `DeckInput` (band, level, knownWords, goal, goalOther, interests) and `deckPrompt()`; `src/llm/claude.ts` sends it to `claude-sonnet-5-5` (effort low, JSON schema, 60 s). Update the old claudeDeckMaker test input (listed in the proposal). Check: deck-prompt tests and decks tests pass.
- [x] 1.4 `src/decks/jobs.ts`: builds the input from the profile, checks the answer, retries once on a fast failure. Check: deck-checks tests, deck-jobs unit + integration tests pass.
- [x] 1.5 Manual check with the real model (VPN on): one deck at band 1 and one at band 4 for "Ordering food"; words written in the PR. Check: the PR shows both lists.
- [x] 1.6 All server checks: `npm test`, `npm run test:integration` (`lockwords_test_d`), typecheck, lint, `npm run openapi` shows no change. Maestro full run still passes (no app change).

Manual check (1.5), 2026-11-17, "Ordering food", Spanish for an English speaker, goal travel, interests food and music:
- Band 1 (beginner, 400), 7.4 s: el agua, la comida, el menú, la mesa, el postre, pedir, la cuenta, la bebida, sin, el camarero.
- Band 4 (intermediate, 4,700), 7.3 s: la sobremesa, pedir la cuenta, el menú del día, para compartir, estar de rechupete, ponerse las botas, el aperitivo, la guarnición, dejar propina, el comensal.
- Spec fix: the band scenario had (beginner, 1850) → 2, but vocab-engine 2.1 puts 1,500–3,249 in band 3. Changed to (beginner, 1499) → 2.

## 3. Docs
- [x] 3.1 `apps/server/CLAUDE.md` (deck words follow vocab-engine Part 2), `src/llm/README.md`, `docs/roadmap.md`. Check: the files say so.
- Not done: `reading`, `meaning`, `scene`, `useit` fields — the cards cannot show them yet (needs a card design change).
- Not done: start the deck early, deck cache, ready-made fallback deck — the flow asks for the topic first; a later change.

## Workflow follow-up
- Server only: no new Maestro video; Hamid approves the PR on the test output and the manual deck lists. Then `/opsx:archive` → merge main in, rerun checks → squash merge.
