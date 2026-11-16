# Design

## Context
See proposal.md. `onboarding-profile` gave us the profile, the shared screen parts and the API client. `apps/server/src/llm/README.md` says: one client for every model call, one module per AI task, tests never call a real model.

## Goals / Non-Goals
**Goals:** chat parts that New words and Use it can reuse as they are; an AI task interface that tests replace with a fixture; decks and cards tables that SRS can build on.
**Non-Goals:** background jobs, pictures, streaming, the animated Kai renderer, translated Kai lines.

## Decisions

### Tables
```
decks  id uuid PK · user_id uuid · topic text · title text · reason text · cefr text · status text ('proposed'|'ready') · created_at
cards  id uuid PK · deck_id uuid → decks.id · position int · word · translation · example · example_translation · stage int default 0 · created_at
```
`cards.deck_id` has a real foreign key (tests do not truncate `decks`). `decks.user_id` has none yet, same reason as `profiles` (see tech-debt). Generate inserts the 10 cards and flips the status in one transaction.

### AI task
`src/llm/make-deck.ts` exports the type `DeckMaker = { propose(input): Promise<{ title, reason }>; cards(input): Promise<Card[10]> }` and a Zod schema for its output.
- `src/llm/fixture.ts`: `fixtureDeckMaker` (the Spanish "Ordering food" deck; fixed titles for the four travel ideas, else `Words for: <topic>`).
- `src/llm/claude.ts`: `claudeDeckMaker(apiKey)`: one `fetch` to the Messages API per call, model from one constant, 30 s timeout, JSON output checked with the Zod schema. Unit-tested with a fake `fetch`. Never called in tests or CI.
- `index.ts` picks Claude when `ANTHROPIC_API_KEY` is set, else the fixture. `AppDeps.deckMaker` and `AppDeps.decks` (store) are optional like `profiles`.

### Stores
`ProfilesStore` gains `get(userId)` and `setChat(userId, name, chatLanguage)`. `DecksStore`: `create`, `get(userId, id)` (returns null for other users), `saveCards(id, cards)`.

### Chat screen
`src/app/onboarding/kai.tsx` keeps a list of messages (`kai` text, `user` text, `deck` card) and a `step` (`name` → `language` → `topic` → `proposed` → `generating` → `ready`). All step logic is in `src/onboarding/kai-script.ts` as pure functions (`linesFor(step, ctx)`), so the wording is tested without rendering. Bold is written as `**word**` and split by `ChatBubble`.
Kai's lines for a step appear one after another with a short delay (300 ms). Under Jest the delay is 0.

### Kai header
`KaiHeader` takes a `pose` (`greeting`, `idle`, `listening`, `thinking`, `celebrate`) and shows the still SVG from `assets/kai/` with a slow up-down move (`Animated`, native driver). Pose per step: name → greeting, language/topic → idle, proposed → listening, generating → thinking, ready → celebrate.

### Finishing
`markOnboardingFinished()` moves from O9 to the two O10f answers. A user who quits during the chat starts onboarding again at O1 on the next open (answers are in memory only). The profile row is simply saved again.

## Risks / Trade-offs
- Generate inside the request can take 10–20 s with a real model. Fine for one user testing; move to pg-boss before launch.
- The Claude call cannot be tried from here (no working key; the API is blocked from Iran without a VPN). It is covered by a fake-fetch test only.
- A restart in the middle of the chat repeats O1–O9.
