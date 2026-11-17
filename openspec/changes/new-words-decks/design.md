# Design

## Context

- Change 1 gives one `kai_chat` model call per turn with a JSON answer, and a list of abilities in `src/kai/abilities/`.
- Decks already have: `POST /v1/decks` (propose), `POST /v1/decks/{id}/generate` (background job, 10 cards), `GET /v1/decks/{id}`, the deck page, and the deck card with three states.
- `GET /v1/deck-ideas` gives four fixed topics per goal. Onboarding uses it. Its code says Kai will pick ideas with AI in the New words change.

## Goals / Non-Goals

**Goals:**
- Ideas come from the same Kai call that writes the message, so the cards match what Kai says and no second wait is needed.
- Reuse the deck tables, the generate job and the deck card.

**Non-Goals:**
- Changing how words are picked for a deck (PR #19).
- Changing onboarding's first deck.

## Decisions

1. **Ideas ride on the Kai answer.** The model may return `decks`: 1 item (the learner's own idea) or 3 items (Kai's ideas), each `{ topic, title, titleTranslation, reason }`. The server saves each as a `proposed` deck and links them to Kai's last line of the turn. Other choice: Kai returns topics and the server calls the existing propose task for each. Not now: three more model calls and a long wait.
2. **Kai decides when to offer, the prompt says when.** The context gets `newWordsLeft` (cards at stage 0) and the topics of the learner's decks and of today's ideas. The rules (ask first on the first visit; offer when asked or when `newWordsLeft` is under 10 after practice; never repeat a topic) are in the prompt and tested there.
3. **"Deck is ready" is a turn with an event,** `{ event: "deck_ready", deckId }`, sent by the app when generate returns `ready`. Kai writes the line. The server checks the deck is the caller's and ready. Other choice: the server posts Kai's line from the job. Not now: the app would need a push or a poll to see it.
4. **The Review dot is kept on the phone** (secure storage flag, set when a deck becomes ready, cleared when the Review tab opens). The server already knows new words exist; a server-side "unseen" count can replace it when Review's own badge rules are designed.
5. **Old idea cards.** A proposed deck that is not in the newest idea set is shown in the `disabled` card state. Its row stays `proposed`; nothing is deleted.
6. **Title translation is a new nullable column.** Decks made before, and the onboarding deck, have none and show no translation line.

## Risks / Trade-offs

- **Bad ideas (too hard, off interest).** → The prompt gets level, goal, interests and notes. Part of the real-AI check in tasks: 10 idea sets read by hand for A1, B1, C1.
- **The learner leaves while the deck is made.** → The job keeps running (it is a background job). On return the card shows the deck's real state, and the app sends the ready event if it was not sent.
- **Two writers of "Deck card".** → See Impact in the proposal.
