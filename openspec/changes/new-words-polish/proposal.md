# Proposal

## Why

The New words chat works (PRs #25, #26, #27) but four small gaps are left. Kai's header shows only three states. A tapped option does not move up as in the onboarding chat. Persian and Arabic text sits on the wrong side. Only the newest 50 messages can be read. Hamid handed these over on 2026-11-19 ("please get all this 5 done"), so the choices here are ours and are written in `tasks.md`.

Epic: roadmap **4. New words tab**. A polish change after the three parts.

## What Changes

- **Kai's state follows the chat** on the New words screen, by the same rules as the onboarding chat (`kaiStateFor()`): `greeting` when Kai opens, `listening` while the composer has text, `thinking` while the app waits for the server, `speaking` while a typing bubble shows, `making` with progress while a deck is made, `celebrate` when a deck is ready or a word is added, `oops` when a turn fails, `waiting` after 20 quiet seconds. New here: `sleeping` after 2 quiet minutes (the state is already in Kai's spec).
- **A tapped option moves up** into the chat as the learner's bubble (`RiseIn`), as in the onboarding chat.
- **The line queue stays.** The screen keeps its own queue for Kai's lines. The shared `useKaiTyping` cannot be used without breaking tests we may not edit (the reason is in `tasks.md`).
- **Right-to-left text.** Every text in the chat aligns by its own script: a Persian or Arabic text is right-aligned and reads right to left, any other text is left-aligned. This covers Kai's line, its translation, the learner's bubble, the composer, the word card and the deck card.
- **Older messages.** `GET /v1/kai/chat?before=<message id>` returns the 50 messages before that one. The answer has `hasMore: true` when older messages are left. The screen loads the page before when the learner scrolls to the top, and the chat stays where it was.

- **Kai is slower to send the learner to Review.** Found on the real AI on 2026-11-19: a learner wrote only "Hola Kai" and Kai took them to Review. The prompt now allows the Review action only for a clear ask to practice or a yes to Kai's own offer.

Out of scope: new Kai drawings ("asking", "I don't know", "happy" as their own states), a right-to-left app layout (tab bar, header), Free limits.

Analytics events: none (PostHog comes in epic 9).

Figma: no new screens. N1 [First visit](https://www.figma.com/design/HSABWihDUDlsVz85aixHiT/?node-id=247-871) stays the reference. Figma has no right-to-left frame; the rule here is "each text by its own script".

Easy mode: nothing. Other languages: this change is for them (Persian, Arabic, Hebrew, Urdu).

## Capabilities

### New Capabilities

(none)

### Modified Capabilities
- `new-words/mobile`: Kai's states on the screen, the tapped option, right-to-left text, older messages.
- `new-words/server`: reading the chat takes `before` and says if older messages are left; when Kai may lead to Review.

## Impact

- Server: `routes/kai-chat.ts`, `kai/chat.ts`, `db/kai.ts`, one prompt rule in `llm/kai-chat.ts`. No migration.
- Mobile: `(tabs)/index.tsx`, `new-words/chat.ts`, small edits in `components/chat/` (`chat-bubble`, `composer`, `word-card`, `deck-card`, `kai-header`, a new `direction.ts`).
- Shared files touched: `openapi.json`, mobile `schema.ts` (both made again), `api/client.ts` (`fetchKaiChat` takes `before`), the chat parts above. The onboarding and Use it chats use the same parts: their text is now aligned by script too, which changes nothing for left-to-right text.
