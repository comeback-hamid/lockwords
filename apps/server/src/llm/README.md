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
- `kai-chat.ts`: one turn of the New words chat (`KaiChat`, the Zod shape, the prompt, the fixture). The real call in `claude.ts` is tried against the real API: `npx tsx scripts/kai-try.ts`.
- `../kai/abilities/decks.ts`: the deck part of Kai's answer (ideas, sizes, the ready event) and of the stand-in Kai. Tried against the real API: `npx tsx scripts/kai-decks-try.ts`.
- `make-deck.ts` and the fixture take the deck's own size (`DeckInput.wordCount`, 10 to 30; none = 10). The fixture has 30 cards; the first 10 never change.
- Not built yet: the shared `client.ts` (Langfuse prompts, retry once, tracing). Move `claude.ts` onto it with the next AI task.
- `ask-word.ts`: Kai answers one question about a word after Use it (`POST /v1/cards/{id}/ask`), 1 to 3 lines; the fixture gives one fixed answer. `use-it.ts` now also returns `followUp`, one suggested question. Tried against the real API on 2026-11-20 (about 2 s each).
- `translate-script.ts`: translates Kai's onboarding script (`src/kai/script.ts`, about 50 short lines) into one language, once; the route keeps it. Tried against the real API on 2026-11-20 with Persian (about 10 s, every key, place holders kept).
- `make-deck.ts` asks for a `meaning` in the learned language for the top band only; tried against the real API on 2026-11-20 (about 10 s, 8 of 10 meanings kept by the check before it was loosened for phrases).
- `plan-decks.ts`: the learner's word plan (three next decks for their goal, `GET /v1/plan`). Tried against the real API on 2026-11-20 (about 2 s; topics come in the learner's own language).
- `deck-pictures.ts` (2026-11-23): the pictures of a deck. One call to the OpenAI Images API draws every word as a grid on one sheet (`sheetPrompt`, `gridFor`: 10 → 4 × 3, 20 → 5 × 4, 30 → 6 × 5); `fixtureSheetMaker` is the stand-in. `make-deck.ts` asks the word model for a `picture` idea per word (kept as `picture_hint`). Tried against the real APIs with `npx tsx scripts/deck-pictures-try.ts`: words 9 s (10) to 19 s (30), one sheet 22 to 28 s, the grid was right every time. `claudeDeckMaker.propose` now writes the title in the learned language with `titleTranslation` (it was the learner's own language: the Persian deck bug).
- `deck-pictures.ts` (2026-11-25): one word alone (a single word kept in a "Random Words N" deck) is one small image, not a sheet: `singlePrompt`, 1024 × 1024, quality low. Tried against the real API: 13 s, 196 image tokens (about 0.6 US cents at $30 per 1M image tokens); medium was 18 s and 439 tokens and looked the same.
