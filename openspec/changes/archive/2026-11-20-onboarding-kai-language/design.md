## Decisions
- **One script, keyed lines.** The server owns the English script as `{ key: text }` (`src/kai/script.ts`), with `{name}` and `{language}` as place holders. The app keeps the same English copy as its built-in fallback.
- **Translate once per language, keep it.** Table `kai_scripts` (`language` PK, `lines` JSON, `created_at`), like the cached word-test pages. The AI gets the whole script in one call and must return the same keys; bold marks, emoji and place holders must survive. A bad answer is not saved.
- **The endpoint returns two maps**, `native` and `learning`, so the app can show a line and its translation without a second call. English needs no AI.
- **No call for English + English-only cases:** when both needed languages are English the app skips the call.
- **4 second limit in the app**, then English. The chat never waits longer than today.
- **The fixture translator returns the English lines unchanged**, so tests and Maestro stay stable.

## Risks
- A weak translation in a rare language. The lines are short and simple; a native check comes with launch prep (epic 9).
