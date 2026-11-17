# Tasks

## 1. Server

- [ ] 1.1 Tests first: unit tests in `test/unit/onboarding.test.ts` (new cases only): `PUT /v1/profile` refuses 6 interests and each of `cooking`, `fitness`, `fashion`, `gaming`; takes all 20 one by one; the old-name read rule (the three scenarios). Integration test: a raw row with `['cooking', 'fashion', 'music']` reads back as `['food', 'music']`. Edit the old `test/integration/profile.test.ts` body `['family', 'cooking']` → `['family', 'food']` (approved in the proposal). Run them, see them fail.
- [ ] 1.2 Build: `INTERESTS` = the 20, `.max(5)`, `OLD_INTERESTS` + the read rule, used in `toProfile`. `npm run openapi`. Server tests (unit + integration on `lockwords_test_c`), typecheck, lint green.

## 2. Mobile

- [ ] 2.1 Tests first in `__tests__/onboarding-screens.test.tsx`: O8 Other (box "YOUR REASON", Continue off until text, saves goal + text, leaving Other hides the box); O9 five picked (label "5 OF 5 PICKED", others disabled, sixth tap does nothing, unpick frees). Edit the old O9 test: 24 → 20 tiles (approved in the proposal). Run them, see them fail.
- [ ] 2.2 `npm run api:gen`. Drop the 4 icons in `scripts/gen-icons.mjs`, `npm run icons:gen`. Add `opacity.disabled` to `theme.ts`.
- [ ] 2.3 Build O8 (label, gap) and O9 (20 tiles, limit 5, faded disabled tiles, label). Mobile tests, typecheck, lint green.
- [ ] 2.4 Maestro flow `e2e/flows/onboarding-goal-interests.yaml`, tag `onboarding`: fresh install → O1 … O8 (Other, type a reason, back to Travel) → O9 (pick 5, see "5 OF 5 PICKED", tap a faded tile, unpick one, pick another) → Continue → Kai chat shows. Records `e2e/videos/onboarding-goal-interests.mp4`. On simulator iPhone 17e, Metro 8085, server 8789.

## 3. Docs

- [ ] 3.1 `docs/roadmap.md` (my row in epic 1 + "Merged so far" + "Last updated"), `docs/screens.md` (add O8b and O9b links).

## Notes
- Fresh verifier agent (`/opsx:verify`, `/code-review`) runs before the video goes to Hamid.
