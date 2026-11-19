# Design

## A mark, not a delete

`decks.removed_at` and `cards.removed_at` (time, empty = not removed). Why:

- Chat messages point at decks (`kai_messages.deck_ids`, `ready_deck_id`) and a word card's result names a deck. A real delete would leave ids that point at nothing, or need a cascade through the chat.
- "No lost cards" is a product rule, and "Recently deleted (30 days)" is still open in `docs/product.md`. A mark keeps that door open at no cost.
- Migrations are add-only. Two columns that may be empty fit.

Every reader of cards and decks adds "not removed". A removed deck reads as "not found" everywhere: read, generate, the "deck ready" event, removal a second time.

## Removing a deck

One statement marks the deck when it is the caller's, not removed and not `generating`; the same transaction marks its cards. A `generating` deck answers `409 deck_generating`: the job would still save its cards. A `proposed` deck (an idea never made) can be removed too.

## Removing a card

Marks the card. For a deck that is not a Random Words deck, `decks.word_count` is set to the number of cards left, in the same transaction. So every place that shows a deck's size (the deck answer, the deck card in the chat) follows with no other change. A Random Words deck already counts its cards.

A deck that lost all its words stays, empty. The learner removes the deck itself if they want.

## Random Words decks

- Room: a deck has room when it has fewer than 30 cards that are not removed. So a full deck that lost a word takes the next word.
- Numbers: the next number counts every Random Words deck ever made, removed ones too. So a title is never used twice, and an old chat message that says "Random Words 1" never points at a different deck.
- A removed deck never takes a word.
- Position of a new card: one after the highest position in the deck, removed cards counted, so the order stays right.
- "Already in your words" looks only at cards that are not removed. So a removed word can be added again from a new word card.

## The chat

- A removed deck is left out of the deck cards under a chat message (`db/kai.ts` reads only decks that are not removed). The message text stays.
- A word card whose word was later removed stays as it was ("Added"); it is text and a spent button, so nothing can break.
- The New words screen keeps its lines while the app runs. If it still shows a card of a deck removed a moment ago and the learner taps it, the deck page says it could not load the deck. Nothing crashes. The next load of the chat leaves the card out.
- Kai's facts (word counts, sample words, deck topics) skip removed cards and decks, so Kai may offer a removed topic again.

## The deck page

- Each word row can be dragged left (the same `PanResponder` way the review card uses; no new package). Past a small pull it stays open and shows a red **Delete** button as wide as in Figma. A tap on the row closes it. Only one row is open at a time.
- For screen readers and tests each row also has the action "Delete".
- Delete removes the row at once and calls the server. If the call fails the row comes back and a line says "Could not remove the word."
- **Remove deck** is a text button at the right of the top bar. It opens the system pop-up "Remove this deck?" with Cancel and Remove. After removal: back, or the tabs when there is nothing to go back to.
