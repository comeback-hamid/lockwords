## Context
`review-srs-rules` adds `review_events` (one row per swipe, with the card's state before and after, and the review day). Everything here is read from that table. No new table.

## Decisions
- **Undo = restore `before`.** The server finds the caller's newest event of today that is not undone. If it is a swipe, it writes the event's `before` state back to the card and sets `undone_at`. One step only: after an undo there is nothing to undo until the next swipe. Undone events do not count anywhere (daily limit, streak, numbers).
- **Streak** = the number of review days in a row that have at least one event, ending today, or ending yesterday when today has none yet. Pure function in `src/review/summary.ts`, `today` passed in.
- **Minutes** = the sum of the gaps between today's events, each gap cut at 60 seconds, rounded up, 1 at least. No timer in the app.
- **Counts** use each word's last swipe of today, so a Hard word that was then swiped Easy counts once, as Easy.
- **The app remembers "streak card shown" per review day** in SecureStore (`lockwords.streakShown`), listed in `SECURE_KEYS`. The server does not need to know.
- **The round moves inside the Review tab** (same route group as the tab), so the native tab bar stays. In the first round the tabs layout hides the bar; it reads the existing "intro done" flag. Check the Expo SDK 58 native tabs docs for the hidden option before building.
- **Live Kai on the start and done screens** uses the existing `KaiView` from `src/kai/` (idle with cards, celebrate when done).

## Risks
- Moving the round route touches `(tabs)/_layout.tsx`, a shared file (`docs/parallel-work.md`). No other session works on tabs now; say so in the PR.
