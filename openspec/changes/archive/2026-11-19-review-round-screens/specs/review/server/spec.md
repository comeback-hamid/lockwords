## ADDED Requirements

### Requirement: Undo the last swipe
`POST /v1/review/undo` SHALL take back the caller's newest swipe of today's review day: the card gets the state it had before that swipe, and the event is marked undone. The answer is `200` with `{ card }` (the review card). With no swipe to take back today, or right after an undo, the answer is `409` with `{ "error": "nothing_to_undo" }`. Undone swipes do not count for the daily new-card limit, the streak or today's numbers.

#### Scenario: Undo I know it
- **WHEN** a user swipes a stage 2 card I know it and calls undo
- **THEN** the card is stage 2, not known, and is in today's round again

#### Scenario: Undo twice
- **WHEN** undo is called twice in a row
- **THEN** the second answer is `409`

#### Scenario: Nothing today
- **WHEN** the user swiped nothing today
- **THEN** the answer is `409`

### Requirement: Review summary
`GET /v1/review/summary` SHALL answer `200` with `{ day, name, streakDays, today }`. `day` is today's review day. `name` is the learner's name or null. `streakDays` is the number of review days in a row with at least one swipe, ending today, or yesterday when today has none. `today` has `words`, `minutes`, `easy`, `hard`, `known` and `stages` (the level of each word swiped today, in order).

#### Scenario: Three days in a row
- **WHEN** the user swiped on each of the last 3 review days, today included
- **THEN** `streakDays` is 3

#### Scenario: Missed a day
- **WHEN** the user swiped 2 days ago and today, but not yesterday
- **THEN** `streakDays` is 1

#### Scenario: Today's numbers
- **WHEN** the user swiped 3 cards today: Easy, Hard then Easy on the same card, and I know it
- **THEN** `today.words` is 3, `easy` is 2, `hard` is 0 and `known` is 1

#### Scenario: Minutes
- **WHEN** today's swipes are 10 seconds apart, with one break of 20 minutes
- **THEN** the break counts as 60 seconds
