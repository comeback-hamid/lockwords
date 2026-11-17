# Proposal

## Why

Kai can talk (change `new-words-kai-chat`) but cannot give the learner new words yet. This change lets Kai offer deck ideas in the chat, make a deck from one of them or from the learner's own idea, and lead the learner to practice it. From Hamid's voice note and answers of 2026-11-17.

Epic: roadmap **4. New words tab**. Change 2 of 3. Needs change 1 merged. Can be built at the same time as change 3 (`new-words-single-words`).

## What Changes

- **Kai offers deck ideas.** Three ideas at a time, as deck cards the learner swipes sideways. Each card has the level, the word count, the title, a short reason and a **Generate** button.
  - First visit: Kai first asks "I have 3 decks ready for you. Want to see them?". The cards come only after a yes.
  - Later: Kai offers ideas when the learner asks, or when the learner has practiced and has few new words left. Not on every visit.
  - The ideas fit the learner's level, goal, interests and Kai's notes, and do not repeat decks they already have.
- **The learner's own deck.** The learner says what they need in the chat. Kai may ask **one** short question with tap answers (for example: single words or phrases?), then shows one deck card with Generate. No form.
- **No fixed buttons** for "Make my own deck", "How do I say…?" or "I have a question". Kai says in the talk that the learner can ask for these.
- **Deck titles are in the learned language**, with a one-line translation under the title when translation is on. (Only for decks made in this chat. The first deck in onboarding is not changed here.)
- **Making the deck.** Tap Generate → the other cards go away, the chosen card shows "Making your deck…" with progress, Kai is in the `making` state.
- **Deck ready.** The deck is in the learner's word list at once. There is no "Add to My words" step. Kai says the deck is ready and is in Review now. The card says "10 WORDS · IN YOUR WORD LIST" and opens the deck page when tapped. The **Review tab gets a red dot** until the learner opens Review.
- **Two options then:** "Let's practice" (Kai says it takes them to Review; one second later the Review tab opens) and "Make another deck" (Kai asks: a suggestion, or your own idea?).

Open, needs Hamid's answer:
- **(open) Deck size.** `docs/product.md` says decks have up to 30 words and the first deck has 10. Figma N2–N4 show "10 WORDS". This spec says **10 words**, because the server makes 10 today. Say if decks made here should have 30.

Suggested by me, please check:
- No limit on how many decks a learner can make (Hamid: skip limits for now).
- Old idea cards that were not made stay in the chat history, grayed out, when a newer set was offered.

Out of scope: single words and Random Words (change 3), Free limits, deck pictures, changing the deck page N7, the title language of the onboarding deck.

Analytics events: none (PostHog comes in epic 9).

Figma (V1 file): N1 [First visit](https://www.figma.com/design/HSABWihDUDlsVz85aixHiT/?node-id=247-871) · N2 [Deck ideas](https://www.figma.com/design/HSABWihDUDlsVz85aixHiT/?node-id=247-1018) · N3 [Making a deck](https://www.figma.com/design/HSABWihDUDlsVz85aixHiT/?node-id=247-1164) · N4 [Deck ready](https://www.figma.com/design/HSABWihDUDlsVz85aixHiT/?node-id=247-1279) · N4b [Going to Review](https://www.figma.com/design/HSABWihDUDlsVz85aixHiT/?node-id=2053-745) · N5 [My own deck](https://www.figma.com/design/HSABWihDUDlsVz85aixHiT/?node-id=247-1433) · N7 [Deck (words)](https://www.figma.com/design/HSABWihDUDlsVz85aixHiT/?node-id=132-1077) (not changed).

Easy mode: nothing. Other languages: titles are in the learning language and translations in the native language of the profile, whatever they are.

## Capabilities

### New Capabilities

(none)

### Modified Capabilities
- `new-words/server`: Kai can attach deck ideas to a turn; a "deck is ready" turn; chat messages carry decks.
- `new-words/mobile`: deck cards in the chat, making a deck, the ready state, the Review dot.
- `decks/server`: a deck has a title translation.
- `kai/mobile`: the deck card shows a title translation and new ready wording.

## Impact

- Server: column `decks.title_translation`, column `kai_messages.deck_ids`, one migration. `src/kai/abilities/decks.ts` plus one line in `abilities/index.ts`. The `kai_chat` answer shape gets the optional field `decks`.
- Mobile: `components/chat/deck-card.tsx`, a new `deck-ideas.tsx`, the New words screen, the tab layout (the dot).
- Shared files touched: `db/schema.ts` + migration, `openapi.json`, mobile `schema.ts`, `(tabs)/_layout.tsx`, `components/chat/deck-card.tsx`. Change 3 does not touch the deck card or the tab layout. Both add a migration: the one that merges second makes its migration again.
- PR #19 (`level-matched-deck`) changes how the 10 words are picked. This change calls the same generate endpoint and does not touch that code.
- PR #20 (`kai-chat-live`) also changes the "Deck card" requirement (timed count). Whichever is archived second keeps both sets of sentences.
