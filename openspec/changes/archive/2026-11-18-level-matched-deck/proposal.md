## Why
The first deck must fit the learner (walkthrough 2026-11-17, `docs/vocab-engine.md` Part 2). Today the prompt only says "CEFR level X" and ignores the word-test result, the goal and the interests. A C1 learner can get "train, ticket, far".

Epic 1, Onboarding + first deck (roadmap row `vocab-engine`, deck half). Part d, change 2 of 3: `kai-character` → **`level-matched-deck`** → `kai-chat-live`. Server only.

## What Changes
- A deck band (0–4) for every deck, from the self-rated level and the word-test result, exactly as `deckBand()` in vocab-engine 2.1. The app's levels map as: `brand_new` → a0, `beginner` → a1, `some_basics` → a2, `intermediate` → b1, `advanced` → b2. The test result (`profiles.known_words`) wins over the self-rating.
- The deck's words come from the vocab-engine 2.3 prompt: system prompt, learner block (language, native language, level, test result, goal + their own words for "other", interests), the deck request, the band text from 2.2 (and the 25 % easy / 50 % at level / 25 % stretch mix for bands 1–4, the measured size for bands 3–4), and the self-check at the end.
- Model: Claude Sonnet 5.5 (`claude-sonnet-5-5`), effort low, JSON-schema output. Timeout 60 s (it runs in the background job, so no web limit).
- Checks after the answer, as 2.3 says: drop items with no word, translation or example; drop duplicates (case-insensitive); fewer than 10 left = failed; more than 10 = the first 10. Asterisks around the word in the example are removed before saving.
- The job tries once more if the first try failed in under 12 seconds (vocab-engine 2.4). Two failures = failed, as today (deck back to `proposed`, nothing saved).
- The deck card's level label stays the one the learner saw on O7 (`profiles.cefr`).

Out of scope (Not done, written in tasks.md): `reading`, `meaning`, `scene` and `useit` fields (the cards cannot show them yet); starting the deck before the user picks a topic (2.4 "start early"); the deck cache; a ready-made fallback deck; deck ideas from interests; the title from this call (the title still comes from the propose step).

Analytics events: none.
Easy mode: nothing. Other languages: works for every language (the prompt is language-neutral; non-Latin `reading` comes later).

Figma: none (no screen changes). O10d–O10f look the same: https://www.figma.com/design/HSABWihDUDlsVz85aixHiT/?node-id=239-2255

## Capabilities
### New Capabilities
None.
### Modified Capabilities
- `decks/server`: "Make the cards" now picks words for the learner's band, goal and interests, retries once on a fast failure, and checks the answer as above.

## Impact
- Server: `src/decks/band.ts` (new: `deckBand`, band texts), `src/llm/make-deck.ts` (input gains band, goal, interests, test result), `src/llm/claude.ts` (new prompt, model settings), `src/llm/fixture.ts`, `src/decks/jobs.ts` (inputs, retry, checks). No route or OpenAPI change. No migration.
- App: nothing.
- Old tests changed (needs Hamid's OK with this proposal): `apps/server/test/unit/decks.test.ts`, only the test "claudeDeckMaker: sends the key, reads JSON from the answer, refuses a bad answer" (its input object gains the new fields, and the answer shape is the new one). No other old test.
