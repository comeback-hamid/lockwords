# Proposal

## Why

After the questions, the user meets Kai and gets a first deck of 10 words. This is the moment the product shows its value. It needs the chat parts (used again by New words and Use it), the first deck tables and the first AI task.

Epic: roadmap **1. Onboarding + first deck**. This change joins `kai-chat-ui`, `deck-generation` and `onboarding-kai-deck`. It lands in the same PR as `onboarding-profile`. Decided overnight by the agent.

## What Changes

- App: O9 now leads to the Kai chat (O10–O10f) instead of the tabs. Onboarding is finished when the deck is ready and the user answers "Shall we practice them now?".
- App: chat parts copied from Figma: Kai header (176 tall), Chat bubble (Kai left, user right green), Reply options (pills on the right + hint), Composer (text + mic/send), Deck card (three states: proposed with Generate, generating with a progress bar, ready).
- App: a simple deck page that lists a deck's words (opened from the ready deck card and from "Show me the words first").
- Server: `PUT /v1/profile/chat` saves the user's name and chat language.
- Server: `GET /v1/deck-ideas` gives four short deck topics for the user's goal.
- Server: `POST /v1/decks` proposes a deck for a topic (title, level, why). `POST /v1/decks/{id}/generate` fills it with 10 cards. `GET /v1/decks/{id}` returns it with its cards.
- Server: `llm/` gets its first task, `make-deck`, behind one interface. Tests and local runs use a fixture. The real Claude call is written but is only used when `ANTHROPIC_API_KEY` is set.
- New tables `decks` and `cards`.

Agent decisions to check:
- Kai is a still picture per pose with a soft breathing move. The full animated renderer (38 states) is its own later change (`kai-character`).
- Kai's lines are fixed English text in the app. The chat-language answer is saved but not used yet (needs AI translation).
- Deck making runs inside the request (no background job yet). The "n / 10 words" bar on the card is a timed animation, not real progress.
- No pictures on cards or decks yet (picture making is a later change).
- With no AI key, every topic gets the fixture deck ("Ordering food", Spanish). The card says so only in dev builds.
- "OK, let's practice!" ends onboarding and opens the Review tab. The practice screens O12–O14 and the paywall O15–O16 belong to the Review, Use it, Widgets and Paywall epics.
- The mic button in the composer is shown but does nothing yet (voice input comes with Speak).

Out of scope: practice (O12–O13c), widget step (O14), trial and paywall (O15–O16), deck pictures, SRS, editing or deleting decks.

Analytics events: none yet (PostHog comes in epic 9).

Figma (file `HSABWihDUDlsVz85aixHiT`, page Onboarding): O10 `239:1926` · O10b `239:2010` · O10c `239:2123` · O10d `239:2255` · O10e `239:2369` · O10f `239:2483`.

Easy mode: nothing. Other languages: the fixture deck is Spanish; real decks for any language need the AI key.

## Capabilities

### New Capabilities
- `decks/server`: deck ideas, proposing a deck, making its cards, reading a deck.
- `kai/mobile`: the Kai chat parts every chat screen uses.

### Modified Capabilities
- `onboarding/mobile`: O9 leads to the Kai chat; onboarding finishes after the first deck. Adds the O10–O10f chat.
- `onboarding/server`: adds saving the name and chat language.

## Impact

- Server: tables `decks`, `cards`; columns `name`, `chat_language` on `profiles`; new env value `ANTHROPIC_API_KEY` (optional); new routes; `src/llm/`.
- App: `src/components/chat/`, `src/app/onboarding/kai.tsx`, `src/app/deck/[id].tsx`; O9 save handler changes.
