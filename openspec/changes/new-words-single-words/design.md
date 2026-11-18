# Design

## Context

- Change 1 gives the Kai turn, its JSON answer and the abilities list.
- Cards live in `cards` and belong to a deck. Review picks new cards oldest deck first. The speaker in Review uses the phone's text-to-speech in the learning language.

## Goals / Non-Goals

**Goals:**
- A single word becomes a normal card, so Review, the lock screen and the deck page need no new rules.
- The learner never manages Random Words decks.

**Non-Goals:**
- A dictionary. Kai gives one meaning and one example.

## Decisions

1. **The word card rides on the Kai answer** as `word: { word, translation, example, exampleTranslation }`, saved with the message. Adding it later needs no second model call.
2. **Random Words are normal decks with `kind: "random"`** (other decks are `kind: "topic"`). Title "Random Words N", status `ready`, CEFR from the profile. Other choice: cards with no deck. Not now: every card query and the deck page assume a deck.
3. **Which deck takes the word is decided at add time, on the server:** the newest random deck with fewer than 30 cards, else a new one with the next number. The chat answer also says which deck that is right now, so the button can name it.
4. **Adding is safe to repeat.** The route is keyed by the chat message. A second call returns the first result. A word already in any of the user's decks is not added and answers `already: true`.
5. **The add runs in one database transaction** with a lock on the user's random decks, so two fast taps cannot make two decks or 31 cards.

## Risks / Trade-offs

- **Kai gives a wrong word or example.** → Same real-AI check as change 1: 20 "how do I say" answers read by hand in Spanish and one non-Latin language.
- **"Random Words" is English app text.** → Fine for now; the app's own text is English everywhere. Goes with app translation later.
- **Review order.** New cards join oldest deck first, so a word added today may wait behind older decks. → Accepted for v1; noted for the Review rules.
