# use-it/server Specification

## Purpose
Checking a sentence the user wrote with a word, and moving the word up when it is good.

## Requirements

### Requirement: Check a sentence
`POST /v1/cards/{id}/use-it` with `{ sentence }` (1–300 characters) SHALL ask the AI task to judge it and answer `200` with `{ good, lines, movedUp, stage, followUp }`: 1–4 short Kai lines and one follow-up question or null. A good sentence counts like an Easy swipe, once per card per review day, when the card is in today's round: `movedUp` is true and one `use_it` history row is saved. A weak sentence changes nothing. A failed AI call answers `502`.

#### Scenario: Good sentence
- **WHEN** the owner sends a good sentence for a due stage 3 card
- **THEN** `good` is true, `movedUp` is true and `stage` is 4

#### Scenario: Second good sentence the same day
- **WHEN** the owner sends another good sentence for that card the same day
- **THEN** `good` is true, `movedUp` is false and `stage` is still 4

#### Scenario: Weak sentence
- **WHEN** the sentence does not use the word
- **THEN** `good` is false, `movedUp` is false and the stage is unchanged

#### Scenario: AI fails
- **WHEN** the AI task throws
- **THEN** the answer is `502` with `{ "error": "check_failed" }` and the stage is unchanged

### Requirement: Ask about a word
`POST /v1/cards/{id}/ask` with `{ question }` (1–300 characters) and an optional `sentence` SHALL ask the AI task to answer as Kai and answer `200` with `{ lines }` (1–3 short lines). It never changes the card and saves no history. If the AI call fails the answer is `502` with `{ "error": "ask_failed" }`. Another user's card answers `404`.

#### Scenario: A question
- **WHEN** the owner asks "Why “le”?" about "la propina"
- **THEN** the answer has 1 to 3 lines and the card's stage is unchanged

#### Scenario: Someone else's card
- **WHEN** user B asks about user A's card
- **THEN** the answer is `404`

#### Scenario: AI fails
- **WHEN** the AI task throws
- **THEN** the answer is `502`
