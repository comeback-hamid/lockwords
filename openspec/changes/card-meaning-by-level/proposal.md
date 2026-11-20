## Why
Figma O12c shows a high-level card back with the meaning written in the language being learned, not a translation. `docs/product.md` says the same ("higher levels get meanings in the target language"). Today every card shows a translation. Hamid's answer (2026-11-20): from B2 up. Epic 1 (Onboarding + first deck) in `docs/roadmap.md`; the Review card uses the same back.

## What Changes
- A card can have a `meaning`: one short definition in the language being learned.
- The deck maker writes a meaning for every word when the learner's deck band is the top one (B2–C1). Lower bands get none.
- The card back in a round shows the meaning when the card has one, else the translation. The translation is still saved for every card: the lock screen, the hard words list, the deck page and the Use it word row keep using it.

Out of scope: single words from the New words chat ("Random Words"), which keep the translation only; changing old cards (they have no meaning and keep the translation).

## Capabilities
### New Capabilities
None.
### Modified Capabilities
- `decks/server`: new: Meaning for high levels.
- `review/mobile`: new: Meaning on the card back.

## Impact
- Server: one migration (`cards.meaning`, nullable), `src/llm/make-deck.ts` (prompt, schema, checks), `src/db/decks.ts`, `src/db/cards.ts`, `src/routes/review.ts` and `src/routes/decks.ts` (the field), `openapi.json`.
- App: `src/app/review/round.tsx`.
- Old tests: the card helper in `apps/mobile/__tests__/review.test.tsx` and the exact card shape in `apps/server/test/unit/review.test.ts` get the new optional field only if the types need it.
- Analytics events: none.
- Figma: [O12c](https://www.figma.com/design/HSABWihDUDlsVz85aixHiT/?node-id=280-2092) · [A4](https://www.figma.com/design/HSABWihDUDlsVz85aixHiT/?node-id=62-1193).
- Easy mode: nothing. Other languages: the meaning is written in whatever language is learned.
