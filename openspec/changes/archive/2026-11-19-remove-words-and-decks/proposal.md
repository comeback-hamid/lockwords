# Proposal

## Why

Hamid's rule (2026-11-17): a deck that Kai made is in the learner's word list "unless the user removes their words or the entire deck". Today nothing can be removed. A learner who gets a word they do not want, or a deck they do not need, is stuck with it in Review.

Epic: roadmap **4. New words tab** (a gap left after its three changes). Hamid handed this work over on 2026-11-19, so the choices here are made by the session and listed in `tasks.md`.

## What Changes

- **Remove a word.** On the deck page the learner swipes a word left and taps the red **Delete**. The word leaves the deck, Review and the hard words for the lock screen. A hint above the list says "Swipe left on a word to remove it" (Figma N7).
- **Remove a deck.** The deck page gets **Remove deck** in the top bar. A pop-up asks first. After a yes, the deck and all its words are gone and the app goes back to where the learner came from.
- **Server.** `DELETE /v1/cards/{id}` and `DELETE /v1/decks/{id}`. Only the owner can remove. A deck that is being made cannot be removed.
- **Removed things stay away.** A removed card is never in a review round, the hard words, the deck, or Kai's word facts. A removed deck is not shown under a chat message any more. A removed word can be added again later.
- **Random Words decks** lose words and are removed like any deck. A Random Words deck that lost a word has room again. Numbers are never used twice.

Removal is a mark (`removed_at`), not a real delete. See `design.md`.

Out of scope: undo and "Recently deleted" (open in `docs/product.md`), removing from the Progress tab (epic 3), the rest of the deck page from Figma N7 (title, pictures, "Practice these words").

Analytics events: none (PostHog comes in epic 9).

Figma (V1 file): N7 [Deck (words)](https://www.figma.com/design/HSABWihDUDlsVz85aixHiT/?node-id=132-1077). The Remove deck control is not in Figma; it is built from the app's own parts.

## Capabilities

### New Capabilities
- `decks/mobile`: removing a word and a deck on the deck page.

### Modified Capabilities
- `decks/server`: remove a card, remove a deck, Random Words decks after a removal.
- `review/server`: removed cards stay out of the round and the hard words.
- `new-words/server`: removed decks and words in the chat and in Kai's facts.

## Impact

- Server: columns `decks.removed_at` and `cards.removed_at`, one migration. Two routes. Readers of cards and decks skip removed rows (`db/decks.ts`, `db/cards.ts`, `decks/random-words.ts`, a few lines in `db/kai.ts`).
- Mobile: the deck page, two client calls.
- Shared files touched: `db/schema.ts` + migration, `openapi.json`, mobile `schema.ts`, `api/client.ts`, `app.ts` types, a few lines in `db/kai.ts` (owned by the chat polish session).
- No native package. No new dev build.
