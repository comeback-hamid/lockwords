## Context
`review-srs-rules` gave the server a review day, a history table and the "in today's round" check. Use it reuses all three.

## Decisions
- **`canUseIt` is decided on the server** and sent with each card of the round: `stage >= 3`, or the learner has no history before today (their first review day). The app only shows or hides the button.
- **A good sentence is an Easy swipe** through the same code path (`applySwipe` + one `review_events` row, kind `use_it`), so the daily limit, the streak and today's numbers count it with no extra rule. It needs the card to be swipeable today (`canSwipe`); otherwise the feedback comes back with `movedUp: false`.
- **The judge returns one more field, `followUp`** (a short question the learner might ask, or null). The fixture returns a fixed question so tests and Maestro are stable.
- **Ask is a separate AI task** (`ask-word`), small and cheap, with the word, its translation, the learner's sentence and the question. It never touches the card.
- **The chat has two phases:** before a good sentence, typed text is a sentence to check; after it, typed text is a question. One state value in the screen, no new store.

## Risks
- A learner can ask many questions. No limit now (Hamid: no free limits for now).
