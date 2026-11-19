# Tasks

## 1. Server

- [x] 1.1 Tests first: integration tests for removing a card (204, deck and `wordCount` follow, 404 for another user, unknown id and a second time), removing a deck (204, then 404 everywhere, another user 404, `generating` 409, a `proposed` idea), the round, hard words, swipe and Use it after a removal, Random Words (room again, removed deck → next number, a removed word can be added again), the chat (removed deck left out, "deck ready" 404) and Kai's facts. Unit tests for the routes with fake stores and for the deck number. Run them, see them fail.
- [x] 1.2 Columns `decks.removed_at` and `cards.removed_at`, one migration (`ADD COLUMN IF NOT EXISTS`).
- [x] 1.3 `DecksStore.remove`, `CardsStore.remove`, the two routes; every reader skips removed rows (`db/decks.ts`, `db/cards.ts`, `decks/random-words.ts`, `db/kai.ts`).
- [x] 1.4 `npm run openapi`. Verify: `npm test`, `npm run test:integration`, `npm run typecheck`, `npm run lint` green.

## 2. Mobile

- [x] 2.1 Tests first: the deck page (loading, error, words, the hint, Delete by the row action, the count follows, a failed delete puts the word back, the empty deck, Remove deck with Cancel and Remove, a failed removal, where the app goes after). Client tests for the two calls. Run them, see them fail.
- [x] 2.2 `npm run api:gen`; `api.removeCard` and `api.removeDeck` in `src/api/client.ts`.
- [x] 2.3 The deck page: swipe row with Delete, the hint, Remove deck with the pop-up. Verify: `npm test`, `npm run typecheck`, `npm run lint` green.
- [x] 2.4 Maestro flow `e2e/flows/remove-words-and-decks.yaml` (tag `my-words`): make a deck in the chat, open it, swipe a word left, Delete, see the count fall and Review follow, then Remove deck and see Review follow. Records `e2e/videos/remove-words-and-decks.mp4`. All other flows still pass.

## 3. Docs

- [x] 3.1 `docs/roadmap.md`, `docs/architecture.md` (removal is a mark), the app and server `CLAUDE.md` lines.

## Decisions made while building (not asked)

Hamid handed this work over on 2026-11-19 ("please get all this 5 done"). These are the session's choices:

- **A mark, not a delete.** `decks.removed_at` and `cards.removed_at`. Chat messages point at decks, "no lost cards" is a product rule, and "Recently deleted" is still open. Nothing in the app can bring a removed word back yet.
- **No undo, one pop-up.** Delete on a word has no pop-up (the swipe and the tap are two steps already, like iOS Mail). Remove deck asks first, because it takes many words at once.
- **Remove deck is a red text button in the top bar.** Figma N7 has no control for it. The pop-up is the system one, as the language screen already uses.
- **A removed deck is left out of the chat**, not shown greyed. The message text stays. The chat on screen keeps the card until it loads again; a tap on it then opens the deck page, which says "Could not load the deck."
- **A word card whose word was later removed still says "Added".** The same message cannot add it again; a new word card for the same word can.
- **The deck's size follows.** Removing a card sets `decks.word_count` to the cards left (not for Random Words decks, which count their cards). So the deck card in the chat shows the true number with no change in the chat code.
- **A deck with no words left stays**, and says "No words in this deck." The learner removes it with Remove deck.
- **A deck being made cannot be removed** (`409 deck_generating`). An idea that was never made (`proposed`) can.
- **Random Words numbers count removed decks.** After "Random Words 1" is removed the next deck is "Random Words 2". A title is never used twice, so an old chat message never names the wrong deck.
- **A second removal answers `404`**, like any id that is not there.
- **Kai's facts skip removed things**, so Kai may offer the topic of a removed deck again.
- **The swipe uses `PanResponder`**, as the review card does. `react-native-gesture-handler` is installed but no screen uses it and the app has no gesture root; no new package and no new dev build.
- **`remove` is optional on the store types** (`DecksStore`, `CardsStore`), so the fake stores in older tests still type-check. The real stores always have it.
- **Edits in the chat session's files:** four lines in `apps/server/src/db/kai.ts` (the "not removed" filters). Nothing in the New words screen.
- **Not in this change:** the rest of Figma N7 on the deck page (the title in the learning language, the progress line, "Practice these words"), the deck list (P2), undo.

## Results

- **Maestro (2.4):** `remove-words-and-decks` passes with the stand-in AI on `LW New words 3` (2026-11-19, 3 min 12 s). It makes a deck of 12 in the chat, deletes three words by swipe (12 → 9 words, Review 20 → 19 cards), checks that one open row closes when another opens, cancels Remove deck once, removes the deck (Review back to 10 cards), and after a restart the chat loads without the deck's card. The video is `e2e/videos/remove-words-and-decks.mp4`.
- **Seen in the video:** the deck card in the chat shows "9 WORDS" after the three deletes, so the size follows there too. Right after the deck is removed the chat on screen still shows its card until the chat loads again (see the decisions).
