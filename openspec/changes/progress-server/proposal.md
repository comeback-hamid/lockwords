## Why
The Progress tab (Figma P1–P3) is empty. It needs numbers the server does not give yet. Hamid answered 10 questions on 2026-11-20 ("Yes, all suggested"). This change is the server half. Epic 3 (Progress tab) in `docs/roadmap.md`.

## What Changes
- `GET /v1/progress`: the word bank total, new / learning / mastered counts, the number of decks, the goal, the date the goal is reached, and one level per word for the grid.
- `GET /v1/decks`: the learner's decks with word counts and one level per word.
- A deck's cards also say when they are hard or known, so the deck page can filter.
- `POST /v1/cards/{id}/restore`: brings back a word that was marked "I know it".
- `GET /v1/review?deckId=`: today's round for one deck only ("Review this deck"), same rules.

Hamid's answers: mastered = Stage 5; learning = Stage 1 to 4; new = not reviewed yet. "I know it" words count as mastered in the total and are not in the grid. The goal is the next round hundred above the words to learn. The date is when that many words reach Stage 5 at the pace of the last 7 days.

Out of scope: the screens (`progress-decks`, `progress-home`), the word plan (`word-plan`), "Recently deleted".

## Capabilities
### New Capabilities
- `progress/server`: the progress numbers.
### Modified Capabilities
- `decks/server`: new: Deck list, Restore a known word.
- `review/server`: new: A round for one deck.

## Impact
- Server: new `src/progress/numbers.ts` (pure), `src/db/progress.ts`, `src/routes/progress.ts`; `src/routes/decks.ts`, `src/routes/review.ts`, `src/db/decks.ts`, `src/db/cards.ts`, `openapi.json`. No migration.
- Analytics events: none. Figma: [P1](https://www.figma.com/design/HSABWihDUDlsVz85aixHiT/?node-id=183-1185) · [P2](https://www.figma.com/design/HSABWihDUDlsVz85aixHiT/?node-id=275-206) · [P3](https://www.figma.com/design/HSABWihDUDlsVz85aixHiT/?node-id=275-443).
- Easy mode: nothing. Other languages: nothing.
