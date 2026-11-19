## Context
`src/decks/jobs.ts` runs `deckMaker.cards()` inside the pg-boss job (or inline in tests). `src/llm/claude.ts` builds a one-line prompt with only topic, languages and CEFR. `profiles` already stores `level`, `known_words`, `goal`, `goal_other`, `interests`. Part b changes the word test but keeps saving its result in `knownWords`.

## Decisions
1. **`deckBand` and the band texts live in `src/decks/band.ts`**, copied word for word from vocab-engine 2.1–2.2, plus the level map (`brand_new` → a0 …). Pure functions, unit-tested with the doc's numbers.
2. **The prompt builder is a pure function** (`deckPrompt(input)` in `src/llm/make-deck.ts`) so tests read the exact prompt text without a model. `claude.ts` only sends it.
3. **Language names:** profiles may store a code (`es`) or a name. The prompt uses `Intl.DisplayNames` in English for a code, the text as is otherwise.
4. **Model call:** `claude-sonnet-5-5`, system prompt from 2.3, effort low, JSON-schema output with the four fields we store (`word`, `translation`, `example`, `example_translation`) as an array. The exact Messages API fields are taken from the Claude API docs at build time, not memory. Timeout 60 s.
5. **Retry and checks are in the job**, not the model module, so the fixture and the real model share them. The job measures the first try with an injected clock (no `Date.now()` inside the rules).
6. **Fixture** keeps its fixed Spanish deck; it ignores the band. Tests that check the prompt use a fake `fetch`.

## Risks / Trade-offs
- [Sonnet takes 14–20 s; the route waits 20 s] → the app already reads the deck again while it is `generating`.
- [Two tries can take ~40 s] → only a fast failure (< 12 s) is retried.
- [Cannot test the real model from Iran without VPN] → one manual run with Hamid's VPN on, using `ANTHROPIC_API_KEY` from `~/.config/lockwords/secrets.env`; result written in the PR. If the VPN is off, written as "Not done".
