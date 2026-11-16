# Tasks

## 1. Server

- [ ] 1.1 Tests first: unit tests for the estimate rule and `GET /v1/word-test`, `POST /v1/word-test/estimate`, `PUT /v1/profile` (good, bad body, no token) with a fake store; integration test that a second `PUT` leaves one row. Run them, see them fail.
- [ ] 1.2 Build the Spanish seed lists, the estimate function, the `profiles` table + migration, the three routes; rewrite `openapi.json`. Server tests, typecheck, lint green.

## 2. Mobile

- [ ] 2.1 Tests first: Jest tests for the flow rules (next route, step numbers, profile body), the answers store, and each screen (O1/O1b/O1c, O2, O3, word test with loading and error, O7 with loading and error, O8, O9 with save error), plus the start rule (onboarding vs tabs). Run them, see them fail.
- [ ] 2.2 Add `react-native-svg`, generate `icon-paths.ts`, regenerate API types. Build the shared parts (TopBar, Footer, ButtonPrimary, TextLink, Box/OptionRow, CodeBadge, Radio, LevelMark, WordChip, InterestTile, TextField, Icon).
- [ ] 2.3 Build the screens O1–O9, the answers store, the start rule and the save at the end. Mobile tests, typecheck, lint green.
- [ ] 2.4 Maestro flow `e2e/flows/onboarding-profile.yaml`, tag `onboarding`: fresh install → O1 … O9 → tabs → restart → tabs. Records `e2e/videos/onboarding-profile.mp4`. Update `app-launch` and `guest-login` flows only by adding a setup step if they now start in onboarding.

## 3. Docs

- [ ] 3.1 Update `docs/architecture.md` (routes, table), `apps/mobile/CLAUDE.md` (onboarding folder, Icon), `docs/roadmap.md`.
