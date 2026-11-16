# Design

## Context
See proposal.md. The app has silent guest login, an API client from OpenAPI, and three placeholder tabs. Figma components (Top bar, Footer, Box, Option row…) repeat on every question screen.

## Goals / Non-Goals
**Goals:** one small set of shared parts that match the Figma components; answers survive Back; server owns the word lists and the estimate rule.
**Non-Goals:** saving half-finished onboarding across app restarts (a restart starts at O1 again); editing the profile later.

## Decisions

### Routes
`src/app/index.tsx` decides: finished → `/(tabs)`, else → `/onboarding/learning`. Screens in `src/app/onboarding/`: `learning`, `speaks`, `welcome`, `level`, `word-test` (param `band` = 0..2), `estimate`, `goal`, `interests`. A Stack with no header; Back = `router.back()`.

### Answers store
`src/onboarding/store.ts`: one module-level object + `useSyncExternalStore` (same pattern as `src/auth/me-store.ts`). No new state library. Screen logic that can be tested without rendering lives in `src/onboarding/flow.ts` (next route after Level, step numbers, body for `PUT /v1/profile`).

### "Finished" flag
`lockwords.onboarded` in SecureStore, listed in `SECURE_KEYS` so a fresh install clears it. Read once at start. Chosen over asking the server because the app must open without a network.

### Server
- `src/onboarding/word-test.ts`: seed lists (`es` only) + `estimate()` as a pure function. Language match: lowercase, `es` or `spanish`.
- `profiles` table: `user_id` uuid PK → `users.id`, `learning_language`, `native_language`, `level`, `known_words` int null, `cefr` text null, `goal`, `goal_other` text null, `interests` text[] , `updated_at`. Upsert on `user_id`.
- Routes with `@hono/zod-openapi`; the interest and goal lists are Zod enums, so the app gets them as types.
- `AppDeps` gains `profiles: ProfilesStore` next to `users`.

### Icons and pictures
`react-native-svg` + one generated file `src/components/icon-paths.ts` holding only the Octicons we use (script `scripts/gen-icons.mjs` reads the dev-only `@primer/octicons` package). `Icon` takes `name`, `size` (16 or 24), `color`.
Kai on O2 and O7 uses the still SVG poses in `assets/kai/` through `expo-image`. The animated renderer comes with the Kai chat change.

### Screen fit
Figma frames are 393×852. Screens use flex: a scroll area for content and the Footer pinned to the bottom with the safe-area inset, so smaller phones scroll instead of clipping.

## Risks / Trade-offs
- Octicons has no airplane or food icon; the nearest glyphs are used (listed in the morning report). Exact Figma icons can be exported later.
- Word test only for Spanish: every other language skips straight to Goal.
- A restart in the middle of onboarding starts again at O1.
