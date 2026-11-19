# Proposal

## Why

The New words tab is an empty screen. Hamid described it on 2026-11-17 (voice note and written answers): it is one ongoing chat with Kai, and Kai is a real agent that knows the learner, remembers them, and talks around their words. This change builds that chat. It is the base for the two changes that follow (deck ideas; own deck and single words).

Epic: roadmap **4. New words tab**. Change 1 of 3.

## What Changes

- **The New words tab becomes a chat with Kai.** One chat per user. It keeps its history after a restart.
- **Kai opens the chat.**
  - First visit: Kai says who they are and what they help with (words for your level and your goals). For A1 and A2 learners Kai adds that they may write in their own language.
  - Later visits: Kai does not always talk about decks. Kai can praise what the learner practiced, tell a short point about one of their words (meaning, use, culture), or say it is time to practice and lead to Review.
- **Kai is an agent with memory.** For every answer Kai gets the learner's profile (name, languages, level, goal, interests), notes Kai saved before, the last messages, and facts about their words (how many, how many reviewed lately, how many due, some of the words). When the learner says something new about themselves, Kai saves a short note. Kai never asks for the goal; Kai may guess it and save the guess.
- **How Kai talks.** 1 to 3 short lines, with emoji and **bold** key words, in the language being learned, at the learner's level. Kai answers in the learned language even when the learner writes in their own language. Kai switches to the learner's language only when they ask for it. Kai only helps with language learning.
- **Translation.** Every Kai line has a translation in the learner's language. It shows under the line, after a divider, in a smaller font. One on/off button sits at the top right, next to Kai. It starts on for A1 and A2, off for B1 and above. The app remembers a change.
- **Reply options.** Kai gives 0 to 3 options. None when the question is open (like a name). The user can always type.
- **Lead to Review.** When the learner wants to practice, Kai says "I take you to Review" and one second later the app opens the Review tab.
- Typing dots and Kai's moving states come from `kai-chat-live` (PR #20) and `kai-character` (PR #18). This change uses them and adds no new rules for them.

Suggested by me, please check:
- **The mic is hidden on this screen.** The page is text only in v1, and a mic that does nothing is confusing. Figma still shows it.
- **A daily limit of 200 messages per user**, so one user cannot run up a large AI bill. Kai says kindly that they talked a lot today.
- **Kai's notes are not shown to the user in v1.** There is no screen to see or change them.
- **"A new day"** for Kai's opening means: Kai has not opened the chat in the last 12 hours.
- **Option buttons are in the learned language**, with no translation on them.

Out of scope: deck ideas and making decks in the chat (change 2), own deck, single words and Random Words (change 3), Free limits (Hamid: skip for now), voice input, photos, showing Kai's notes.

Analytics events: none (PostHog comes in epic 9).

Figma (V1 file): N1 [First visit](https://www.figma.com/design/HSABWihDUDlsVz85aixHiT/?node-id=247-871) · N1b [Kai is typing](https://www.figma.com/design/HSABWihDUDlsVz85aixHiT/?node-id=2053-640) · N8 [A normal day, translation off](https://www.figma.com/design/HSABWihDUDlsVz85aixHiT/?node-id=2053-868). On N1 the last Kai line (about 3 decks) belongs to change 2.

Easy mode: nothing. Other languages: Kai speaks whatever language the profile says is being learned, and translates into the profile's native language. Nothing is tied to Spanish or English.

## Capabilities

### New Capabilities
- `new-words/server`: the Kai chat for the New words tab: history, turns, Kai's opening, what Kai knows, memory notes, the translation setting.
- `new-words/mobile`: the New words tab screen: the chat, its states, options, the translation button, the move to Review.

### Modified Capabilities
- `kai/mobile`: Kai's bubble can show a translation line. The composer can hide the mic.

## Impact

- Server: new tables `kai_messages` and `kai_notes`, one new column on `profiles`, one migration. New routes under `/v1/kai/chat`. New AI task `kai_chat` in `src/llm/` (real call on Claude, a fixture for tests). New folder `src/kai/`.
- Mobile: `src/app/(tabs)/index.tsx` becomes the chat. `components/chat/chat-bubble.tsx` and `kai-header.tsx` get small additions. New calls in `src/api/client.ts`.
- Shared files touched (see `docs/parallel-work.md`): `db/schema.ts` + migration, `app.ts`, `openapi.json`, mobile `schema.ts`, `api/client.ts`, `components/chat/`. This change must merge before changes 2 and 3 start.
- Needs PR #18 and PR #20 merged first for moving Kai and typing dots. If they are late, this change ships with the still Kai picture and a simple dots bubble, and says so in `tasks.md`.
- `openspec/config.yaml`: adds the domain `new-words`.
