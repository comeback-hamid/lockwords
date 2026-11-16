# Design

## Context
See proposal.md. Decks and cards exist (`stage` 0). The chat parts exist. The Review tab is a placeholder.

## Decisions

### SRS on the server only
`src/review/srs.ts`: `applySwipe(card, direction, now)` → new `{ stage, known, hard, dueAt }` and `backInDays`. Pure, `now` passed in. Intervals `[1, 3, 7, 14, 30]` days for stage 1–5. Use it's "up one stage" uses the same function (`easy` without clearing rules changed).
New columns on `cards`: `due_at timestamptz null`, `known boolean default false`, `hard boolean default false` (add-only migration).
`CardsStore`: `round(userId, now)`, `get(userId, cardId)`, `save(cardId, patch)`, `hardWords(userId)`. Ownership is checked by joining `decks.user_id`.

### Use it AI task
`src/llm/use-it.ts`: `UseItJudge = { check({ word, translation, sentence, learningLanguage, nativeLanguage }) → { good, lines } }` + Zod shape. Fixture: good when the sentence contains the word without its article (case-insensitive). Claude version in `claude.ts`, tested with a fake `fetch`.

### App routes
- `(tabs)/review.tsx`: start / all done. Loads the round and keeps it in `src/review/round-store.ts` (module store) so the round and Use it do not load again.
- `review/round.tsx`: outside the tabs, so no tab bar. Card flip = state. Swipe = `PanResponder` + `Animated` (no new gesture package); the three labels under the card are buttons that do the same, for accessibility and Maestro.
- `use-it/[id].tsx`: reuses `KaiHeader` (close icon instead of back), `ChatBubble`, `ReplyOptions`, `Composer`.
- `intro/hard-words.tsx`, `intro/trial.tsx`, `intro/paywall.tsx`. `src/review/intro.ts` keeps `lockwords.introDone` in SecureStore (in `SECURE_KEYS`).
- Speaker: `expo-speech` `Speech.speak(word, { language })` with the learning language code when it is a listed language.
- The dev-only user id line stays on the Review tab (an existing Maestro flow reads it there).

### Lock-screen phone picture
O2 Welcome already draws the phone with a word card. That drawing moves to `src/components/lock-phone.tsx` and both screens use it.

## Risks / Trade-offs
- No undo for "I know it".
- The round is loaded once; a second device would not see changes until the tab reloads.
- The paywall sells nothing yet. It must not ship to real users before RevenueCat is connected.
