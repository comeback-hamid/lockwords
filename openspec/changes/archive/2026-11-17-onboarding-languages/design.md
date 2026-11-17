# Design

## Context

O1 and O1c are one shared screen (`src/onboarding/language-screen.tsx`) given a list. The chosen language is stored as `{ code, name }` (`code: null` = typed) and sent with `languageValue` (`code ?? name`). `QuestionScreen` already puts the content in a ScrollView with a fixed footer, so a long list scrolls today. The server has two AI tasks behind interfaces (`DeckMaker`, `UseItJudge`) with a fixture and a real Claude call in `src/llm/claude.ts`.

## Goals / Non-Goals

**Goals:** one list of 13 languages shared by both screens; a server check that turns any typed text into match / suggestion / unknown; O1c refuses the learned language.

**Non-Goals:** storing an ISO code for typed languages (the server returns it, the app does not keep it yet); caching check answers; native-language display names.

## Decisions

- **The 13 languages live in two small files**, `apps/server/src/onboarding/languages.ts` and `apps/mobile/src/onboarding/languages.ts`. The server needs them to answer without AI and to map an AI answer to a listed code; the app needs them to draw the lists. A server endpoint for the list was the other choice; it would add a loading state to O1 for 13 fixed names.
- **Typed languages keep `code: null`** and the server's English name. This keeps `languageValue` and everything after O1c (word test, profile, deck) exactly as today. A listed match becomes the listed choice (`{ code: "es", name: "Spanish" }`), so "spanish" typed gets the Spanish word test.
- **AI task `check_language`** in `src/llm/check-language.ts`: `LanguageChecker = { check(text): Promise<{ isLanguage, name, code }> }` + Zod shape + `fixtureLanguageChecker` (a small table: "spansh" → Spanish, "swedish" → Swedish, about 30 common language names → themselves, anything else → not a language). The real one is in `claude.ts` (export the existing `asker`, `max_tokens` small). The route turns the model answer into match / suggestion / unknown, so the rule is tested without a model.
- **Route file** `src/routes/languages.ts` with `createRoute`, wired with an optional `languageChecker` dep (like `useItJudge`). No key = fixture, as for decks.
- **Failed check lets the text through** in the app (502, network error). Onboarding must not stop because the AI is down or blocked.
- **The pop-up is `Alert.alert`** (native iOS alert). The "Did you mean" state is a box under the text field with one button, inside the scroll area.
- **Same-language rule** is checked on O1c only (O1 always goes to O1c). Same = same code, or same name ignoring case when both are typed.

## Risks / Trade-offs

- [The model calls a dialect or a made-up word a language] → it is only a suggestion the user accepts; the word test for a typed language is part b's problem.
- [Anthropic is blocked from Iran without VPN] → the check fails, and the typed text goes through as today.
- [Two copies of the list drift] → a server unit test and an app test each pin the same 13 codes in order.
