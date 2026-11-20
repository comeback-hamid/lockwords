## Why
The Review screens in Figma have parts the app does not have: the name on the start screen, the tab bar during a round, the streak card (A7) and the "All cards done" screen with numbers (A9). `docs/product.md` also says a swipe can be taken back. Hamid's answers (2026-11-20): Undo for the last swipe; a streak day = a day with at least one swiped word; the streak card shows once a day in the middle of the round; follow Figma for the tab bar; no sounds in v1. Epic 2 (Review) in `docs/roadmap.md`. Builds on `review-srs-rules`.

## What Changes
- **Undo.** `POST /v1/review/undo` takes back the caller's last swipe of today. The round shows an "Undo" button after a swipe.
- **Summary.** `GET /v1/review/summary` gives the learner's name, the streak in days and today's numbers (words, minutes, Easy / Hard / Know it counts, one level per word).
- **Start screen (A2):** "Hi <name>!" and live Kai (the Skia character), not a still picture.
- **Round (A3–A5c):** the tab bar stays visible; my Close (×) button is removed. In the very first round (onboarding practice, O12) the tab bar stays hidden, as in Figma. The speaker is also on the card back. The Use it button gets the mic icon.
- **Streak card (A7):** once per review day, after half of the round, when the streak is 2 days or more. Any swipe or tap continues.
- **Done screen (A9):** "All cards done", "N words · M minutes", a chain of level squares and the three counts. **BREAKING** for the old text "All done for today".

Out of scope: restoring older "I know it" words (Progress tab); sounds (Hamid: none in v1); card pictures (Hamid: none for now); Use it rules (`use-it-rules`).

## Capabilities
### New Capabilities
None.
### Modified Capabilities
- `review/server`: new Undo the last swipe, Review summary.
- `review/mobile`: Review tab start, Card round, End of a round; new Undo, Streak card, Done screen.

## Impact
- Server: `src/routes/review.ts`, `src/db/review-events.ts`, new `src/review/summary.ts` (streak and minutes, pure), `openapi.json`.
- App: `src/app/(tabs)/review.tsx`, `src/app/review/round.tsx`, `src/app/(tabs)/_layout.tsx` (shared file: tab bar hidden in the first round), `src/review/round-store.ts`, `src/api/client.ts`, new `src/components/level-chain.tsx`, `SECURE_KEYS` (+ `lockwords.streakShown`).
- **No Figma frame for the Undo button.** Proposed: a small text button "Undo" on the right of the "N words left" line, shown only right after a swipe. Hamid checks it in the video.
- **Old tests change** (needs Hamid's OK): `apps/mobile/__tests__/review.test.tsx` ("All done for today" → the done screen; the start screen now also loads the summary), `e2e/flows/first-run.yaml` (same text; no Close button).
- Analytics events: none (PostHog is not connected; `review_done` and `streak_shown` are added with epic 9).
- Figma: [A2](https://www.figma.com/design/HSABWihDUDlsVz85aixHiT/?node-id=261-845) · [A3](https://www.figma.com/design/HSABWihDUDlsVz85aixHiT/?node-id=62-952) · [A4](https://www.figma.com/design/HSABWihDUDlsVz85aixHiT/?node-id=62-1193) · [A7](https://www.figma.com/design/HSABWihDUDlsVz85aixHiT/?node-id=62-859) · [A9](https://www.figma.com/design/HSABWihDUDlsVz85aixHiT/?node-id=62-1506) · [O12](https://www.figma.com/design/HSABWihDUDlsVz85aixHiT/?node-id=280-1900).
- Easy mode: nothing. Other languages: nothing (screen text is English, like the rest of the app).
