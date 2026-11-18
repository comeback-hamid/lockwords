# Proposal

## Why

Learners meet single words in daily life and in the app, and want to keep them. Hamid (2026-11-17): Kai answers "How do I say…?" with a word card, and the learner adds the word to a deck called **Random Words 1**. This change builds the word card and those decks.

Epic: roadmap **4. New words tab**. Change 3 of 3. Needs change 1 (`new-words-kai-chat`) merged. Can be built at the same time as change 2 (`new-words-decks`).

## What Changes

- **A word card in the chat.** When the learner asks how to say something, asks what a word means, or names a word they want to keep, Kai answers with a short line and a word card: the word, a speaker button, the meaning, an example sentence with the word in green, and the example's translation.
- **One button on the card: "Add to Random Words 1".** It always names the deck the word will go to. After a tap it says "Added" and cannot be tapped again. The Review tab gets the red dot.
- **Random Words decks.** A deck named "Random Words 1" holds single words. It takes 30 words. When it is full, the next word starts "Random Words 2", and so on. These decks are made by themselves; the learner does not create or pick them. Their words join Review like any new word. On the deck page they look like any other deck.
- **A word the learner already has is not added twice.** The card then says "Already in your words".
- **Language questions.** The learner can ask any question about the language. Kai answers shortly. No fixed "I have a question" button: Kai says now and then that the learner can ask.
- **One option after a word card:** "Another way to say it". ("Use it in a talk" is removed: Speak is not in v1.)

Suggested by me, please check:
- The meaning and the example's translation on the word card always show, also when the translation button is off. Without them the card has no meaning on it.
- A word counts as "already in your words" when the same word (ignoring capital letters) is in any of the learner's decks.

Out of scope: a photo of a word (Hamid: later version), adding a word from outside the chat, renaming Random Words decks, Free limits, deck making (change 2).

Analytics events: none (PostHog comes in epic 9).

Figma (V1 file): N6 [A single word](https://www.figma.com/design/HSABWihDUDlsVz85aixHiT/?node-id=247-1558) · N7 [Deck (words)](https://www.figma.com/design/HSABWihDUDlsVz85aixHiT/?node-id=132-1077) (not changed).

Easy mode: nothing. Other languages: the deck name "Random Words" is app text in English for now, like the rest of the app's own text.

## Capabilities

### New Capabilities

(none)

### Modified Capabilities
- `new-words/server`: Kai can attach a word card to a turn; adding that word to a Random Words deck.
- `new-words/mobile`: the word card in the chat and its Add button.
- `decks/server`: Random Words decks.

## Impact

- Server: columns `decks.kind` and `kai_messages.word`, one migration. `src/kai/abilities/words.ts` plus one line in `abilities/index.ts`. New route `POST /v1/kai/chat/messages/{id}/add-word`. The `kai_chat` answer shape gets the optional field `word`.
- Mobile: new `components/chat/word-card.tsx`, the New words screen, one client call.
- Shared files touched: `db/schema.ts` + migration, `openapi.json`, mobile `schema.ts`, `api/client.ts`. It does not touch the deck card or the tab layout. It uses the Review dot from change 2; if change 2 is not merged yet, this change adds the same small flag and the later one keeps one copy.
