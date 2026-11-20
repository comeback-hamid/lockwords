## Context
Today `apps/server/src/review/srs.ts` has two pure functions (`applySwipe`, `pickRound`) and the route saves the result. There is no history and no idea of a "day". Hamid's answers (2026-11-20): 20 new words a day; a day starts at 04:00 phone time; Hard repeats once in the same round; a hard word stays on the lock screen until Stage 3; Easy on a new card = Stage 2.

## Decisions
- **Review day = the local date of (now − 4 hours).** `reviewDay(now, timeZone)` in `src/review/day.ts`, pure, `now` passed in. The app sends the IANA zone in the header `X-Time-Zone` (from `Intl`). A missing or unknown zone means UTC.
- **No new due column.** `due_at` stays a time. A card is due when `due_at` is before the **end** of today's review day. So a card swiped at 23:00 with "1 day" is due all of the next review day. Add-only: nothing is dropped.
- **One history table, `review_events`:** `id`, `user_id`, `card_id`, `kind` (`easy` | `hard` | `known` | `use_it`), `review_day` (date), `before` and `after` (stage, known, hard, due_at as JSON), `undone_at`, `created_at`. The swipe and its event are saved in one transaction. `before` lets the next change undo a swipe without new rules.
- **The daily limit counts started cards:** events of today whose `before.stage` is 0 (not undone), counted per distinct card. The round offers `20 − started` new cards.
- **"In today's round" is decided on the server:** a due card, or a new card while the limit is not reached, or a card with exactly one Hard event today (its second showing). Anything else answers `409 not_due`. This also stops a double send: after the first swipe the card is not due any more.
- **The app does not decide the repeat.** The swipe answer has `again: true` for the first Hard of the day; the app only puts that card at the end of its list.
- **Hard mark:** set by Hard; cleared when a swipe or a good Use it brings the card to Stage 3 or higher, or when it is marked known.

## Risks
- A phone that changes time zone mid-day can see a card one day early or late. Accepted.
- Old tests assert the old rules. They are changed only with Hamid's OK (see proposal, Impact).
