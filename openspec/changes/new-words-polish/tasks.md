# Tasks

## 1. Server

- [x] 1.1 Tests first: unit tests for `GET /v1/kai/chat?before=` (the page before, `hasMore`, no options, 404 for a message that is not the caller's or not an id) and an integration test on the real database (120 messages, three pages, order). Run them, see them fail.
- [x] 1.2 `KaiStore.messages(userId, limit, before?)`, `readChat(…, before?)`, the route's query. `npm run openapi`. Verify: `npm test`, `npm run test:integration`, `npm run typecheck`, `npm run lint` green.
- [x] 1.3 Kai goes to Review too fast (reported by the parent session, 2026-11-19: "Hola Kai" → "Vamos a Review ahora"). Test first (`test/unit/kai-review-rule.test.ts`), then the prompt rule in `src/llm/kai-chat.ts`: the action only for a clear ask to practice or a yes to Kai's own offer.
  - Real AI check with `npx tsx scripts/kai-review-try.ts` on 2026-11-19: 24 of 24 answers as expected (12 cases, twice). Greetings, small talk, a word question, "gracias" and "Ahora no" got a normal answer with no action; most offered practice as a question or an option. "Vamos a practicar", "I want to review my words now" and a yes to Kai's offer went to Review.
- [x] 1.4 Kai mixes the English word "deck" into its lines (reported by the parent session, 2026-11-19: "Tengo 3 decks listos para ti"). Test first (`test/unit/kai-language-rule.test.ts`), then a rule in `src/llm/kai-chat.ts`, and the example sentence in `src/kai/abilities/decks.ts` no longer says "Look, 3 decks for you".
  - Real AI check with `npx tsx scripts/kai-language-try.ts` on 2026-11-19: 20 of 20 answers with no English app word (Spanish and Persian; first visit, new words, own deck, deck ready, a word question; each twice). Spanish said "mazo" or "lista de palabras"; Persian said "دسته" or "مجموعه". "Generate" and "Review" stayed as in the app.
  - Seen in that run, not part of this change: for "I need words for a trip to Shiraz" Kai offered 3 ideas, where the rule for an own deck says 1.

## 2. Mobile

- [x] 2.1 Tests first (`__tests__/new-words-polish.test.tsx`): Kai's states, the tapped option, text direction on every chat part, older messages. Run them, see them fail.
- [x] 2.2 `npm run api:gen`; `fetchKaiChat(before?)`.
- [x] 2.3 Kai's states on the screen (`newWordsKaiState()` in `new-words/chat.ts`, built on `kaiStateFor()`).
- [x] 2.4 The tapped option rises (`RiseIn`).
  - Not done: moving the line queue to the shared `useKaiTyping`. Why: the screen's existing tests cannot stay green with it, and we may not edit them. (1) Jest switches the shared typing off for every screen test (`jest.setup.tsx`), and `new-words-chat.test.tsx` expects the typing bubble before each line. (2) The shared rule types slower (0.8 s + 8 ms a letter; this screen: 0.8 s + 4 ms a letter after the first 20). "Lead to Review" expects Kai's line "¡Perfecto! Te llevo a Review… 🚀" on screen after 0.9 s; the shared rule shows it after 1.06 s. (3) One test checks `typingMs` of `new-words/chat.ts` itself. So the old queue stays, as the brief says for this case. To finish it later: change those three tests together with the move.
- [x] 2.5 Text direction: `components/chat/direction.ts`, used by the bubble, the composer, the word card and the deck card.
- [x] 2.6 Older messages on scroll to the top. Verify: `npm test`, `npm run typecheck`, `npm run lint` green.
- [ ] 2.7 Maestro flow `e2e/flows/new-words-polish.yaml` (tag `new-words`) with the stand-in AI. All other flows still pass.
- [ ] 2.8 Real AI check on the simulator: a profile learning Persian (native English) and one learning English (native Persian). Screenshots in the PR. Video `e2e/videos/new-words-polish.mp4`.

## 3. Docs

- [x] 3.1 `docs/roadmap.md`, the two app guides.

## Decisions made while building (Hamid said to decide, 2026-11-19)

- **Kai's states Hamid asked for that have no drawing of their own.** No new state was drawn.
  - "sleeping": the state `sleeping` is already in `character-spec.json`. Kai sleeps when it is the learner's turn and nothing happened for 2 minutes. Any typing, tap or scroll wakes it.
  - "asking": no drawing. After Kai's question it is `speaking` while the line is typed, then `idle`, then `waiting` after 20 seconds.
  - "happy": mapped to `celebrate` (a deck is ready, a word was added).
  - "I don't know": the nearest drawn state is `confused`, but Kai's answer from the server does not say when Kai did not understand, so nothing triggers it. A failed turn shows `oops`.
  - Not done: new Kai drawings ("asking", "I don't know", "happy" as their own states), needs a design.
- **Order of states** is the shared `kaiStateFor()` order: `oops`, `making`, `thinking`, `speaking`, `listening`, `waiting`/`sleeping`, `celebrate`, `greeting`, `idle`. So `celebrate` and `greeting` show after Kai's lines are typed, and end when the learner types or sends.
- **`oops` holds 1.2 seconds**, as in the onboarding chat. It also plays when making a deck fails.
- **Direction is found from the text, not from the profile.** A text is right-to-left when most of its letters are Arabic or Hebrew script. Why: the learner may write in either language, Kai mixes both, and a typed language has no code. One English word in a Persian line does not turn it around.
- **Only the text turns.** Kai's bubbles stay on the left, the learner's on the right, and the tab bar and header do not mirror. A right-to-left app layout is a bigger change.
- **Word card:** the speaker button sits on the left of a right-to-left word. **Deck card:** the room kept beside the title moves to the left for a right-to-left title.
- **The chat parts are shared**, so the onboarding and Use it chats align text by script too. Nothing changes there for left-to-right text.
- **`hasMore` is left out when it is false**, like `word` and `decks` on a message: older tests check the exact keys of the answer.
- **`before` that is not the caller's message is `404`**, also when it is not an id at all (as `add-word` does).
- **A page is read as 51 rows** to know if older ones are left; no count query.
- **One page per scroll.** The next page needs a new scroll by the learner, so a chat cannot load all its history by itself.
- **A failed load of older messages shows nothing.** The next scroll to the top tries again.
