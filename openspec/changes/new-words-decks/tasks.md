# Tasks

## 1. Server

- [x] 1.1 Tests first: unit tests for the `decks` part of the Kai answer (1 or 3, field limits, `wordCount` 10–30, 2 fails), the prompt (new words left, topics, offer rules) and `current`. Integration tests for a turn with ideas (decks saved and linked), reading the chat with decks, the ready event (once, 409, 404) `titleTranslation` and `wordCount` on deck answers, and generate filling a deck of 24. Run them, see them fail.
- [x] 1.2 Columns `decks.title_translation`, `decks.word_count` (default 10) and `kai_messages.deck_ids`, one migration. The deck job and the word-making task take the deck's size in place of the fixed 10.
- [x] 1.3 `src/kai/abilities/decks.ts` (shape, prompt part, saving ideas, ready event), one line in `abilities/index.ts`, context additions. Verify: `npm test`, `npm run test:integration`, `npm run typecheck`, `npm run lint` green.
- [x] 1.4 `npm run openapi`; the openapi test passes.

## 2. Mobile

- [x] 2.1 Tests first: deck card (sizes 10 and 30, translation on and off, disabled, new ready text), the ideas row (three cards, dots, one card), making (generate, ready, fails, came back later), opening the deck, the Review dot (set, kept, cleared). Run them, see them fail.
- [x] 2.2 `npm run api:gen`; client additions (`deck_ready` event).
- [x] 2.3 `deck-card.tsx` changes and new `components/chat/deck-ideas.tsx`.
- [x] 2.4 The New words screen: decks under messages, making, ready event; the dot in `(tabs)/_layout.tsx`. Verify: `npm test`, `npm run typecheck`, `npm run lint` green.
- [x] 2.5 Maestro flow `e2e/flows/new-words-decks.yaml` (tag `new-words`): first visit, yes, swipe the ideas, Generate, ready, the Review dot, "Let's practice" lands on Review; then ask for an own deck. Records `e2e/videos/new-words-decks.mp4`. All other flows still pass.
  - The flow also opens the deck page from the ready card and checks the cards after a restart.
  - Not done: the flow does not assert the Review dot. The native tab badge has no text and no accessibility value, so Maestro cannot see it. It is tested in Jest (set, kept after a restart, cleared) and it shows in the video.
  - The video was recorded with the real AI on 2026-11-19 (the fourth try passed; the three before it stopped in the shared onboarding steps, where the tap on Generate did not reach the button; the part 1 session knows).
- [x] 2.6 Real AI check: 10 idea sets at A1, B1 and C1 read for level, interest fit, title language and a sensible size (10 to 30). Results in the PR.
  - Run with `npx tsx scripts/kai-decks-try.ts` on 2026-11-18, twice. First run: 9 of 12 idea sets failed on a `topic` longer than 80 characters; fixed (see the decisions). Second run: 18 of 19 answers good (1 network error), 9 idea sets read.
  - Level: A1 sets are concrete and small (12 to 15 words); B1 15 to 25; C1 15 to 25 with legal, political and literary topics. Interests and notes show (a trip to Mexico City, football, cooking with kids). Titles are in the learning language (Spanish, German, Japanese, English) with a translation in the native one (English, Persian).
  - Around the ideas: the first visit asks first and sends no decks; a later visit with many new words offers nothing; an own deck with a clear wish gives one card; a vague one gets one question, then the card; "25 palabras" gives 25; the ready event gives two options; "make another" asks suggestion or own idea.
  - Seen once: with 2 new words left and 3 words due, Kai chose to nudge the review and offered no ideas. The rule says it may offer, so this is fine.

## 3. Docs

- [ ] 3.1 `docs/roadmap.md` (epic 4).

## Decisions made while building (not in the spec; Hamid said to decide, 2026-11-18)

- **No existing test was edited.** Two older tests fix the old shapes: one server test checks the exact keys of a chat message, and the app tests build `Deck` and `KaiMessage` objects without the new fields. So a message has `decks` only when it has deck cards (left out when empty), and `titleTranslation` is optional in the API type (the server still sends it on every deck, `null` when there is none). The spec text says this now.
- **The onboarding deck card keeps "ADDED TO YOUR DECKS".** Its tests assert that text and the brief says they stay as they are. The New words chat shows "IN YOUR WORD LIST" (`DeckCard` prop `inWordList`). The spec text says this now.
- **A fourth column: `kai_messages.ready_deck_id`.** The spec names three columns. This one marks Kai's "your deck is ready" line, so the ready event is answered once per deck, also when two events come at once.
- **A text that is too long is cut at a word, it does not fail the turn.** In the first real AI run 9 of 12 idea sets had a `topic` of 81 to 110 characters, which failed the whole turn twice. Now `topic` (80), `title` (120) and `reason` (30) are cut at the last whole word. A wrong number of ideas and a size outside 10 to 30 still fail, as the spec says. The prompt asks for shorter texts.
- **Ideas on the first visit are dropped by the server,** also when the AI sends them. The cards come only after a yes.
- **A ready turn never carries new ideas or the review action.**
- **While a deck is made the learner cannot send a message** (the composer keeps the text). One thing at a time; the ready event is a turn too.
- **Once a deck of a row is made, only that card shows** (as in Figma N4). The two other ideas stay `proposed` in the database and Kai is told not to repeat them.
- **A made deck stays tappable when a newer set of ideas comes.** Only ideas that were not made show as disabled.
- **"Came back later":** when New words opens, the app looks at the newest ideas. A deck that is still `generating` shows as generating and the app waits for it. A `ready` one gets the ready event once per app start; the server answers with no messages when Kai already said it.
- **The mix for other sizes** keeps 25 / 50 / 25: at-level = size ÷ 2, stretch = half of the rest, easy = what is left (10 → 3 / 5 / 2, 20 → 5 / 10 / 5). The counts inside the band texts grow by size ÷ 10. Written in `docs/vocab-engine.md` 2.5.
- **The deck call's time limit is 90 s** (was 60 s): a deck of 30 takes about three times a deck of 10.
- **The Review dot is cleared in the tab layout** (when the path is `/review`), so the Review screen is not touched.
- **The deck page (N7) still shows the deck's `topic` as its heading,** which is in English for a chat deck. N7 is out of scope here.
- **The stand-in Kai** asks "3 mazos… ¿Quieres verlos?" on the first visit, gives 3 ideas for "Sí, quiero verlos" / "Una sugerencia", 1 idea for "un mazo sobre …", and the two options after a deck is ready.
- **My own local databases** (`lockwords_dev_decks`, `lockwords_test_decks`), so a migration made again after a merge cannot clash in the shared ones.

## Workflow follow-up

- Hamid approves the spec (checkpoint 1), then the video (checkpoint 2).
