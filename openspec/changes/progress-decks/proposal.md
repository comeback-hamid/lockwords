## Why
Figma P2 (Your decks) and P3 (Deck words) are not built. The deck page that exists (from the New words chat) has no filters, no "Review this deck" and no way to bring back an "I know it" word. Hamid's answers P7–P10 (2026-11-20). Epic 3 (Progress tab) in `docs/roadmap.md`. Builds on `progress-server`.

## What Changes
- **Your decks (P2):** a new screen with the learner's decks: name, "N words · N learning", a chain of level squares. "+" opens the New words chat. A row opens the deck.
- **Deck words (P3):** the deck page gets the chain, the counts, filters (All, Hard, New, Mastered, and Known when there are known words), a red mark on hard words, "Restore" on known words, and "Review this deck".
- **Review this deck:** a round with only this deck's cards. The round opened from a deck has a Close button.
- **Progress tab:** shows the total and a "N Decks" button that opens Your decks. The rest of P1 comes with `progress-home`.

Out of scope: the P1 grid, goal and meadows (`progress-home`); the word plan (`word-plan`); deck icons per topic and pictures (no pictures for now); "From a video" and "My own words" decks (not in v1).

## Capabilities
### New Capabilities
- `progress/mobile`: the Progress tab and Your decks.
### Modified Capabilities
- `decks/mobile`: new: Deck numbers and filters, Restore a known word, Review this deck.

## Impact
- App: new `src/app/decks.tsx`, `src/app/(tabs)/progress.tsx`, `src/app/deck/[id].tsx`, `src/app/review/round.tsx` (Close button outside the first round), `src/api/client.ts`.
- The deck page keeps its "<level> · N WORDS" line, its Close button and swipe to delete, so its old tests and flows stay valid. The new counts are a second line.
- Analytics events: none. Figma: [P2](https://www.figma.com/design/HSABWihDUDlsVz85aixHiT/?node-id=275-206) · [P3](https://www.figma.com/design/HSABWihDUDlsVz85aixHiT/?node-id=275-443).
- Easy mode: nothing. Other languages: nothing.
