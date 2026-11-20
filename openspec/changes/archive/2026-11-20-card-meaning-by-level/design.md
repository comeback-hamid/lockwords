## Decisions
- **`cards.meaning` is a nullable column.** Null means "show the translation". Add-only migration.
- **Band 4 only** (`deckBand` in `src/decks/band.ts`, "B2–C1"): the prompt asks for one more field, `meaning`: a definition in the learned language, simple words, at most 14 words, without the word itself. Other bands do not ask for it, so their output and cost do not change.
- **A missing meaning is not an error.** The checks keep the card and show the translation. A meaning that contains the word itself, or is longer than 140 characters, is dropped the same way.
- **The fixture deck** gets a meaning for band 4 so tests and Maestro can show it.
- **`meaning` is optional in the API** (`string | null`), so every existing caller keeps working.
