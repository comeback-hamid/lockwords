# Design

## Context

O8 and O9 were built in `onboarding-profile` (PR #6). Today:
- O8 Other already shows a text box, but there was no Figma frame for it. The label repeats the title ("WHY ARE YOU LEARNING?") and the gap above it is 8.
- O9 lists 24 interests and has no top limit. The server takes 1–24.
- `profiles.interests` is a plain `text[]` column. No enum in the database.
- Onboarding answers live in memory until O9 saves them, so no old answer list can survive an app update.

## Decisions

### 1. Old interests: a read rule, not a data migration
Hamid asked to decide this and say which. **Read rule only.**
- The column is plain text, so old values do not break the database or a query.
- The cloud is not deployed yet. Old rows exist only on our own Macs. A migration would fix rows nobody else has.
- Migrations here are add-only by rule. A read rule is one small function with unit tests and needs no deploy order.
- The rule sits in one place: where a row turns into a profile (`toProfile` in `src/db/profiles.ts`). Every reader (the deck maker in part d too) gets clean interests without changing its code.
- The next `PUT /v1/profile` writes clean values, so rows heal by themselves.

Rule: `cooking` → `food`, `fitness` → `health`, any name not in the 20 is left out, repeats kept once in first-seen order. A list longer than 5 is not cut: only new saves have the 5 limit.

If the cloud goes live before this merges, we add a one-time `UPDATE` then. Not needed today.

### 2. The list lives on the server; the app follows the generated type
`INTERESTS` in `profile.ts` becomes the 20. `npm run openapi` + `npm run api:gen` make the app type the 20 names, so a dropped name in `interests.tsx` fails typecheck. The app keeps its own label + icon table (labels are UI).

Old names for the read rule live next to the list as `OLD_INTERESTS = { cooking: 'food', fitness: 'health' }` in `profile.ts`.

### 3. Five picked: fade and disable, no new component
Figma has no "disabled" variant for Interest tile. O9b shows the other tiles as the default tile at 40% opacity. The app does the same:
- `disabled` on the `Pressable` and `accessibilityState={{ checked, disabled }}`.
- Opacity from a new theme token `opacity.disabled = 0.4` (same value the primary button already uses; no raw number in the screen).
- The label: `N SELECTED` while under 5, `5 OF 5 PICKED` at 5 (Hamid's own words for the full state).
- `MAX_INTERESTS = 5` in the screen, matching the server's `.max(5)`. The server is the guard; the app limit is for the user.

### 4. O8 Other matches O8b
Only two changes: the label "Your reason" (the field upper-cases it, like O1b) and gap `space[16]` between the list and the field. Everything else already matches: the field takes 80 characters, Continue needs text, the text is trimmed when saved (`profileBody`).

### 5. Icons
`gen-icons.mjs` drops `fitness`, `fashion`, `gaming`, `cooking`, then `npm run icons:gen` rewrites `icon-paths.ts`. Nothing else uses them (checked with grep).

## Risks

- Part d (deck prompt) reads interests. It gets at most the 20 names, the same type, and more than 5 only from an old local row. No change in its code.
- Other parallel sessions also regenerate `openapi.json` and `schema.ts`. Before merge: merge `origin/main`, regenerate both, rerun all checks.
- Old tests edited (listed in the proposal): the O9 tile count in `onboarding-screens.test.tsx`, and `cooking` in `test/integration/profile.test.ts`.
