## MODIFIED Requirements

### Requirement: Make the cards
`POST /v1/decks/{id}/generate` SHALL start a background job that fills the caller's proposed deck with exactly 10 cards, and wait up to 20 seconds for it. While the job runs the deck's `status` is `generating`. A finished job answers `200` with the deck in state `ready`; a job that is still running answers `200` with the deck in state `generating`. Each card has `word`, `translation`, `example`, `exampleTranslation` and `stage` 0. If the AI call fails, the answer is `502` with `{ "error": "generation_failed" }` and nothing is saved.

#### Scenario: Generate
- **WHEN** the owner calls generate on a proposed deck and the job finishes in time
- **THEN** the answer is `200`, `status` is `ready`, and there are 10 cards in order, each with `stage: 0`

#### Scenario: Slow job
- **WHEN** the job is still running after the wait
- **THEN** the answer is `200` with `status` `generating` and no cards, and reading the deck later shows `ready` with 10 cards

#### Scenario: Generate twice
- **WHEN** the owner calls generate again, on a ready deck or while the job runs
- **THEN** no second job starts and the deck never has more than 10 cards

#### Scenario: AI fails
- **WHEN** the AI task throws or returns fewer than 10 valid cards
- **THEN** the answer is `502`, the deck goes back to `proposed` and has no cards
