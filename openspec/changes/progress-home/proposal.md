## Why
The Progress tab (Figma P1) shows only the total and the decks button. Figma has the new / learning / mastered counts, a grid of the goal, "by <date> you'll master N new <language> words" and the pixel meadow. Hamid's answers P1–P5 (2026-11-20). Epic 3 in `docs/roadmap.md`. Builds on `progress-server` and `progress-decks`.

## What Changes
- The Progress tab shows: the total, the three counts with their colors, the "N Decks" button, Kai on a strip of ground, the goal grid (one square per word of the goal: green by level, dark when not added yet), "BY <DATE>", "you'll master", the goal, "new <language> words", and the meadow (one tree per deck, one leaf block per word, drawn from the spec in `docs/design/pixel-meadow.html`).
- `GET /v1/progress` also gives `language` (the name of the language being learned) and `trees` (per deck, the levels of its words, oldest deck first).

Out of scope: the word plan (`word-plan`).

## Capabilities
### New Capabilities
None.
### Modified Capabilities
- `progress/server`: new: Language and trees.
- `progress/mobile`: new: Counts, goal grid and date; The meadow.

## Impact
- Server: `src/routes/progress.ts`, `src/db/progress.ts`, `openapi.json`.
- App: `src/app/(tabs)/progress.tsx`, new `src/progress/meadow.ts` (the spec's numbers and the pure layout), new `src/components/meadow.tsx`, new `src/components/goal-grid.tsx`.
- Analytics events: none. Figma: [P1](https://www.figma.com/design/HSABWihDUDlsVz85aixHiT/?node-id=183-1185).
- Easy mode: nothing. Other languages: the language name comes from the profile.
