## ADDED Requirements

### Requirement: A round with a first card
`GET /v1/review` SHALL take `first=<cardId>`. When that card belongs to the learner and is not known or removed, it is the first card of the round, and the rest of today's round follows in its usual order. A card that is due today is a normal card. A card that is not due today (Hamid, 2026-11-25: look only) comes with `lookOnly: true`: it can be flipped, heard and used in Use it, a swipe on it is still refused, and its level does not change. An unknown, removed or known id is ignored.

#### Scenario: Due today
- **WHEN** the round is asked for with `first` = a hard card that is due today
- **THEN** that card is first, once, with no `lookOnly`

#### Scenario: Not due today
- **WHEN** the round is asked for with `first` = a hard card swiped Hard this morning
- **THEN** that card is first with `lookOnly: true`, and a swipe on it answers `409`

#### Scenario: Unknown id
- **WHEN** `first` is another learner's card
- **THEN** the round is the usual round
