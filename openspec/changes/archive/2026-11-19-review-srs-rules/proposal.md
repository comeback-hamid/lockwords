## Why
Hamid never set the Review rules; the first version was built from guesses. A gap check on 2026-11-20 found 8 places where the server is incomplete. Hamid answered the questions the same day. This change makes the server follow his answers. Epic 2 (Review) in `docs/roadmap.md`.

## What Changes
- **Review day.** A day starts at 04:00 on the phone's clock. A card is due for the whole review day, not from the exact hour of the last swipe. The app sends its time zone with every call.
- **New words per day.** At most 20 new cards are started per review day. After that the round has only due cards.
- **Easy on a new card** gives Stage 2, back in 3 days (as Figma A5b shows). **BREAKING** for the old rule (Stage 1).
- **Hard** still gives Stage 1 and tomorrow, and now the card comes back **once more at the end of the same round**.
- **Lock screen.** A hard word stays hard until it reaches Stage 3 (or is marked known). Before, one Easy cleared it.
- **Swipe checks.** The server accepts a swipe only for a card that is in today's round. A second send of the same swipe changes nothing.
- **Review history.** Every swipe is saved in a new table `review_events`. The next changes (undo, streak, done screen, Use it limits) read it.

Out of scope: undo, streak, the done screen (change `review-round-screens`); Use it rules (change `use-it-rules`).

## Capabilities
### New Capabilities
None.
### Modified Capabilities
- `review/server`: Today's round, Easy swipe, Hard swipe, I know it swipe, Cards are private; new: Review day, Review history.
- `review/mobile`: Swipes (a Hard card comes back at the end of the round).

## Impact
- Server: `src/review/srs.ts`, new `src/review/day.ts`, `src/db/cards.ts`, new `src/db/review-events.ts`, `src/routes/review.ts`, one migration (table `review_events`), `openapi.json`.
- App: `src/api/client.ts` (time zone header), `src/app/review/round.tsx`, `src/review/round-store.ts`.
- **Old tests change** because the rules change (needs Hamid's OK, the edit guard blocks it): `apps/server/test/unit/review.test.ts`, `apps/server/test/integration/review.test.ts`, `apps/server/test/integration/review-round.test.ts`, `e2e/flows/first-run.yaml`. Each edit only moves an old expectation to the new rule; the list with reasons is in `tasks.md`.
- Analytics events: none.
- Figma: [A5 Hard](https://www.figma.com/design/HSABWihDUDlsVz85aixHiT/?node-id=62-1384) · [A5b Easy](https://www.figma.com/design/HSABWihDUDlsVz85aixHiT/?node-id=132-1460) · [A5c Know it](https://www.figma.com/design/HSABWihDUDlsVz85aixHiT/?node-id=132-1533).
- Easy mode: nothing. Other languages: nothing.
