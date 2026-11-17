# Proposal

## Why

Hamid walked through onboarding on 2026-11-17 and fixed three things for O8 Goal and O9 Interests:
- O8: "Other" still opens a text box. It must look like Figma.
- O9: 24 interests is too many. At most 20.
- O9: the user picks at least 1 and at most 5. Today there is no top limit.

Epic: roadmap **1. Onboarding + first deck**. This is part c) of the onboarding section, built in parallel with a) O1–O1c languages, b) O3–O7 word test + estimate, d) Kai animation + chat + deck (O2, O10–O10f).

## What Changes

- **O8 Goal · Other.** No Figma frame existed for this state. Added **O8b Goal · Other** (`2020:2129`). The text box label is now "YOUR REASON" (today it repeats the title "WHY ARE YOU LEARNING?"), and the space between the list and the text box is 16 (today 8), as in O1b. Continue stays off until the box has text.
- **O9: 20 interests.** Cooking (it is under Food), Fitness (under Health), Fashion and Gaming are gone, in the app, on the server and in Figma O9 (`28:618`, updated).
- **O9: pick 1 to 5.** With 5 picked, the other tiles fade and cannot be tapped, and the label reads "5 OF 5 PICKED". Unpicking one makes the others tappable again. New Figma frame **O9b Interests · 5 of 5 picked** (`2020:1974`).
- **Server:** `PUT /v1/profile` takes 1–5 interests from the list of 20. More than 5, or a dropped interest, is refused (`400`).
- **Old saved profiles keep working.** When the server reads a profile, cooking becomes food, fitness becomes health, fashion and gaming are left out, and a repeat is kept once. No data migration (see design).

**BREAKING (API):** `interests` max goes from 24 to 5 and the list from 24 to 20. Only our own app calls it, and the app ships in the same PR.

Old tests this change must edit (Hamid's approval of this proposal is the permission):
- `apps/mobile/__tests__/onboarding-screens.test.tsx`: the O9 test expects 24 tiles → 20. The O8 test is not changed; a new O8 Other test is added.
- `apps/server/test/integration/profile.test.ts`: the saved body uses `cooking`, which is now refused. `['family', 'cooking']` becomes `['family', 'food']`.
No other old test changes. `e2e/subflows/finish-onboarding.yaml` taps Food and Music and checks "2 SELECTED": still true, not edited.

Out of scope: the deck prompt that reads interests (part d), new interest icons (the 20 left already have one), editing interests later from Progress, any other onboarding screen.

Analytics events: none (PostHog comes in epic 9).

Figma (file `HSABWihDUDlsVz85aixHiT`, page Onboarding): O8 `9:263` · **O8b `2020:2129` (new)** · O9 `28:618` (updated to 20 tiles) · **O9b `2020:1974` (new)**.

Easy mode: nothing. Other languages: nothing (the labels are English like the rest of onboarding today).

## Capabilities

### New Capabilities
(none)

### Modified Capabilities
- `onboarding/mobile`: O8 Goal (Other text box), O9 Interests (20 tiles, 1–5 picked, full state).
- `onboarding/server`: profile fields (interests 1–5 of 20), reading old interests.

## Impact

- Server: `src/onboarding/profile.ts` (list of 20, max 5, old-name rule), `src/db/profiles.ts` (apply the rule on read), `openapi.json` regenerated.
- App: `src/app/onboarding/goal.tsx`, `src/app/onboarding/interests.tsx`, `src/api/schema.ts` regenerated, `scripts/gen-icons.mjs` + `icon-paths.ts` (drop the 4 unused icons), one theme token for the faded tile.
- No new package. No native change. No migration.
