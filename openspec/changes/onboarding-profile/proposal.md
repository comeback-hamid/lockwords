# Proposal

## Why

A new user must tell us what they learn, what they speak, their level, their goal and their interests before Kai can make a first deck. This is the first half of onboarding (the question screens). The Kai chat half comes in the next change.

Epic: roadmap **1. Onboarding + first deck**. This change joins three planned changes (`onboarding-languages-level`, `onboarding-word-test`, `onboarding-goal-interests`) into one, because they share the same screens parts and one saved profile. Decided overnight by the agent (Hamid asked for no questions until morning).

## What Changes

- App: first open shows onboarding instead of the tabs. Screens O1 I'm learning (+ O1b Other text box) → O1c I speak → O2 Welcome → O3 Level → O4–O6 Word test → O7 Your estimate → O8 Goal → O9 Interests.
- App: shared parts copied from Figma components: Top bar (back, progress, n/10), Footer (primary button + link), Box + Option row, Code badge, Radio, Level mark, Word chip, Interest tile, Text field, Icon (Octicons).
- Server: `GET /v1/word-test?language=` returns three word lists (basic, intermediate, advanced). Seeded for Spanish only for now.
- Server: `POST /v1/word-test/estimate` turns the tapped words into "≈ N of the 5,000 most common words" + a CEFR label.
- Server: `PUT /v1/profile` saves the answers. New `profiles` table.
- App: after O9 the profile is saved and the user lands on the tabs. Reopening the app goes straight to the tabs.

Agent decisions to check (also in the morning report):
- "Brand new" level skips the word test and the estimate.
- A language with no seeded word test (everything except Spanish today) skips the word test and the estimate. AI-made tests for other languages come with the deck-generation change.
- Estimate rule: basic words stand for the top 1,000, intermediate for the next 2,000, advanced for the last 2,000. Known share × band size, summed, rounded to 50. CEFR: <500 A1 · <1,000 A2 · <2,000 A2+ · <3,000 B1 · <4,000 B2 · else C1.
- The "I have an account" link on O1 is left out until real sign-in exists (cloud change).
- Radio screens: Continue is off until one option is picked. Interests: Continue is off until one tile is picked.
- O8 "Other" opens a text box, like O1b.

Out of scope: the Kai chat (O10–O10f), practice (O12–O13), widget step (O14), trial and paywall (O15–O16), editing the profile later.

Analytics events: none yet (PostHog comes in epic 9; the events will be added then).

Figma (file `HSABWihDUDlsVz85aixHiT`, page Onboarding): O1 `9:475` · O1b `37:756` · O1c `134:1542` · O2 `9:611` · O3 `9:115` · O4 `9:395` · O5 `37:1440` · O6 `37:1615` · O7 `37:1870` · O8 `9:263` · O9 `28:618`.

Easy mode: nothing. Other languages: any language can be typed in "Other"; only Spanish has a word test today.

## Capabilities

### New Capabilities
- `onboarding/server`: the word test lists, the known-words estimate, and saving the profile.
- `onboarding/mobile`: the question screens O1–O9 and when onboarding shows.

### Modified Capabilities
(none)

## Impact

- Server: new table `profiles`, three new routes, a Spanish word-test seed file.
- App: new packages `react-native-svg` (icons and, later, Kai; native, needs a new dev build) and dev-only `@primer/octicons` (icon paths are copied into one small file). New `src/app/onboarding/` routes and `src/components/` parts. `lockwords.onboarded` joins `SECURE_KEYS`.
