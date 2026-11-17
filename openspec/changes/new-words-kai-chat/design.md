# Design

## Context

- The chat parts exist: bubbles, composer, reply options, deck card, Kai header (`apps/mobile/src/components/chat/`).
- The server has one AI client file (`src/llm/claude.ts`): one prompt in, JSON out, checked with Zod. Tests use a fixture and never call a model.
- The profile has what Kai needs to know at the start: languages, `cefr`, `knownWords`, `goal`, `interests`, `name`.
- Hamid is in London now. The real AI can be called from this Mac and from the cloud server.

## Goals / Non-Goals

**Goals:**
- One agent, one place. Every New words answer goes through the same `kai_chat` task with the same context.
- Memory that is simple to read, test and delete.
- Changes 2 and 3 can add what Kai can do (decks, word cards) without changing this base.

**Non-Goals:**
- Streaming answers word by word. Kai's lines arrive whole; the dots bubble covers the wait.
- A general assistant. Kai only helps with language learning.

## Decisions

1. **One model call per turn, JSON answer.** The answer is `{ lines: [{ text, translation }], options: string[], remember: string[], action?: "review" }`, checked with Zod, one retry if the shape is wrong. Other choice: a tool-calling loop with several model calls. Not now: one call is faster (the learner waits), cheaper, and easy to test with a fixture. Changes 2 and 3 add optional fields to the same answer (`decks`, `word`), which is how new abilities are added.
2. **Model: `claude-sonnet-5-5`**, the same as deck making, 20 second timeout. Kai must write correct short text in any language at a given level, so the small model is not enough. I will check the model name and call shape against the Claude API docs when building.
3. **Memory = profile + notes + history + word facts.** Notes are short plain sentences in the table `kai_notes` (at most 50 per user, oldest dropped). The model returns `remember` only when the learner said something new. Other choice: one big summary text rewritten each turn. Not now: notes are easier to test, and one bad rewrite cannot wipe what Kai knows.
4. **History in the prompt: the last 20 messages.** Older messages stay in the table for the screen but are not sent to the model. Notes carry what matters over time.
5. **Translations are always made and saved**, even when the button is off. The button only shows or hides them. So old messages get translations at once when the user switches it on.
6. **The opening is a turn made by the server**, not text fixed in the app. The app asks for it when the tab opens. The server makes one only if Kai has not opened in the last 12 hours. The first opening ever has fixed content rules (who Kai is, what Kai does). Later ones are free, around the learner's words.
7. **The translation setting lives on the profile** (`kai_translation_on`, empty = follow the level). It is the learner's choice across devices.
8. **Code layout for parallel work:** `src/kai/context.ts` (what Kai knows), `src/kai/chat.ts` (a turn), `src/llm/kai-chat.ts` (the prompt, the Zod shape, the fixture). Each later ability gets its own file (`src/kai/abilities/decks.ts`, `words.ts`) and one line in `src/kai/abilities/index.ts`, so two sessions do not edit the same lines.
9. **Message text is never logged.** Logs keep ids, timings and error kinds only.

## Risks / Trade-offs

- **Kai writes above the learner's level.** → The prompt gets the CEFR level and a hard rule on line length. A unit test checks the prompt carries both. Real quality is checked by reading 20 real answers at A1, B1 and C1 before Checkpoint 2, and the results go in the PR.
- **Wrong translations.** → Same model call makes text and translation together, so they match. Risk stays for rare languages.
- **Cost.** → One call per turn, 20 messages of history, daily limit of 200 messages per user.
- **Depends on PR #18 and #20.** → If they are not merged when this is built, use the still Kai and a simple dots bubble, and switch when they land.
- **The model answers off-topic requests.** → Prompt rule plus fixture tests for the refusal shape. It is a soft rule, not a hard filter.
