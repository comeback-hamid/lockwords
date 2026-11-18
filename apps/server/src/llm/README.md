# llm/

Every model call goes through one client (`client.ts`, added with the first AI feature):
fetch prompt (Langfuse) → run → force JSON → validate with Zod → retry once if invalid → trace.

One module per task: `make_deck`, `use_it_feedback`, `kai_reply`, `speak_judge`, `deck_picture`.
A module returns nothing on a bad answer; the service decides the fallback.
Prompt drafts live in `drafts/<task>.md` (text, model, settings, eval results).
Tests never call a real model: one fixture replaces Langfuse and the model.

## What exists today (2026-11-16)
- `make-deck.ts`: the `DeckMaker` interface, Zod shapes, `deckPrompt()` (the vocab-engine 2.3 prompt: band text, mix, measured size, goal, interests) and `checkCards()` (drop empty items and duplicates, strip `*asterisks*`, fewer than 10 = failed).
- `kai-reply.ts`: Kai reads typed text in a Kai chat (`POST /v1/kai/reply`): on the script (the step's answer, checked per step) or Kai's own 1–2 lines. Real: Haiku 5.5, effort low, JSON schema, 8 s. A failed call answers 502 `kai_unavailable`; the app then takes the text as the answer.
- `fixture.ts`: the stand-in used by tests, CI and local runs with no key.
- `claude.ts`: the real call (plain `fetch`). Deck words: Sonnet 5.5, effort low, JSON schema output, 60 s timeout; tried against the real API on 2026-11-17 (about 7 s per deck). Titles and Use it: 30 s timeout.
- The deck job (`src/decks/jobs.ts`) retries once when the first try failed in under 12 s (vocab-engine 2.4).
- Not built yet: the shared `client.ts` (Langfuse prompts, retry once, tracing). Move `claude.ts` onto it with the next AI task.
