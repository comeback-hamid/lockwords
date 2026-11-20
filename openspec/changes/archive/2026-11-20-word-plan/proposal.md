## Why
Figma P1 ends with "YOUR WORD PLAN": a short list of the next decks for the learner's goal. Hamid's answer P6 (2026-11-20): Kai makes a plan of three next decks from the goal and interests; tapping one opens the New words chat with that deck ready to generate. Epic 3 (Progress tab) in `docs/roadmap.md`.

## What Changes
- `GET /v1/plan`: three next deck ideas for the learner (topic, number of words, words or phrases), made by the AI from the profile and the decks the learner already has, and kept. A new plan is made when fewer than three ideas are left or the plan is a week old.
- The Progress tab shows "YOUR WORD PLAN · <GOAL>" with the three ideas. A tap opens the New words tab and asks Kai for a deck about that topic; Kai shows the deck card with Generate.

Out of scope: an icon per idea; a plan screen of its own; editing the plan.

## Capabilities
### New Capabilities
None.
### Modified Capabilities
- `progress/server`: new: Word plan.
- `progress/mobile`: new: Word plan on the Progress tab.

## Impact
- Server: new `src/llm/plan-decks.ts` (type, schema, prompt), fixture and Claude version, new `src/db/plans.ts`, one migration (table `deck_plans`), `src/routes/progress.ts`, `openapi.json`.
- App: `src/app/(tabs)/progress.tsx`, `src/api/client.ts`, new `src/new-words/pending.ts`, `src/app/(tabs)/index.tsx` (reads the pending ask when the tab opens).
- Analytics events: none. Figma: [P1](https://www.figma.com/design/HSABWihDUDlsVz85aixHiT/?node-id=183-1185).
- Easy mode: nothing. Other languages: the ideas are written in the learner's own language.
