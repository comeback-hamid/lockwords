# Tasks

## 1. Server

- [x] 1.1 Tests first: unit tests in a new file `test/unit/interests.test.ts`: `PUT /v1/profile` refuses 6 interests and each of `cooking`, `fitness`, `fashion`, `gaming`; takes all 20 one by one; the old-name read rule (the three scenarios). Integration test (new file `test/integration/old-interests.test.ts`): a raw row with `['cooking', 'fashion', 'music']` reads back as `['food', 'music']`. Edit the old `test/integration/profile.test.ts` body `['family', 'cooking']` → `['family', 'food']` (approved in the proposal). Run them, see them fail.
- [x] 1.2 Build: `INTERESTS` = the 20, `.max(5)`, `OLD_INTERESTS` + the read rule, used in `toProfile`. `npm run openapi`. Server tests (unit + integration on `lockwords_test_c`), typecheck, lint green.

## 2. Mobile

- [x] 2.1 Tests first in a new file `__tests__/onboarding-goal-interests.test.tsx`: O8 Other (box "YOUR REASON", Continue off until text, saves goal + text, leaving Other hides the box); O9 five picked (label "5 OF 5 PICKED", others disabled, sixth tap does nothing, unpick frees). Edit the old O9 test in `onboarding-screens.test.tsx`: 24 → 20 tiles (approved in the proposal). Run them, see them fail.
- [x] 2.2 `npm run api:gen`. Drop the 4 icons in `scripts/gen-icons.mjs`, `npm run icons:gen`. Add `opacity.disabled` to `theme.ts`.
- [x] 2.3 Build O8 (label, gap) and O9 (20 tiles, limit 5, faded disabled tiles, label). Mobile tests, typecheck, lint green.
- [x] 2.4 Maestro flow `e2e/flows/onboarding-goal-interests.yaml`, tag `onboarding`: fresh install → O1 … O8 (Other, type a reason, back to Travel) → O9 (pick 5, see "5 OF 5 PICKED", tap a faded tile, unpick one, pick another) → Continue → Kai chat shows. Records `e2e/videos/onboarding-goal-interests.mp4`. On simulator iPhone 17e, Metro 8085, server 8789.

## 3. Docs

- [x] 3.1 `docs/screens.md` (add O8b and O9b links), `e2e/README.md` (`LOCKWORDS_METRO`).
- [ ] 3.2 `docs/roadmap.md` (my row in epic 1 + "Merged so far" + "Last updated"): in the archive commit, after Hamid's OK on the video.

## Notes from the build
- Server tests are in new files (`test/unit/interests.test.ts`, `test/integration/old-interests.test.ts`); the only old tests edited are the two named in the proposal.
- Mobile tests are in a new file `__tests__/onboarding-goal-interests.test.tsx`; the old O9 test only changed 24 → 20.
- The dev build has no dev client, so it always loads its code from Metro on 8081. Parallel sessions each run their own Metro, so `scripts/e2e.sh` got `LOCKWORDS_METRO=127.0.0.1:<port>`: it copies the flows to a temp folder and adds the `RCT_jsLocation` launch argument to every `launchApp`. Nothing in `e2e/` changes. (Maestro 2.11 does not fill `${VAR}` inside launch arguments, so it cannot live in the flow.)
- Going back to Other keeps the reason typed before. It is only sent when the goal is Other (`profileBody`).
- Fresh verifier agent (`/opsx:verify`, `/code-review`) ran before the video went to Hamid.
