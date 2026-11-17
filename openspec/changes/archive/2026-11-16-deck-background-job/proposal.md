## Why
The deck's words were made inside one web request. A real AI call can take longer than a request may last, and a dropped connection lost the work.

## What Changes
- Making the words is now a background job (pg-boss, in our Postgres). The request waits up to 20 seconds for it.
- A deck has a new state `generating` between `proposed` and `ready`.
- A slow job answers `200` with the deck in state `generating`. The app reads the deck again until it is `ready`.
- A failed job puts the deck back to `proposed` with no cards, as before.

## Capabilities
### New Capabilities
None.
### Modified Capabilities
- `decks/server`: "Make the cards" gains the `generating` state and the background job.

## Impact
- Server: `src/decks/jobs.ts`, `src/decks/queued-jobs.ts`, `src/routes/decks.ts`, `src/index.ts`, `openapi.json`.
- App: `src/api/client.ts` (`generateDeck` keeps reading until ready). No screen changes.
