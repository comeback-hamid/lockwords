# use-it/server Specification

## Purpose
Checking a sentence the user wrote with a word, and moving the word up when it is good.

## Requirements

### Requirement: Check a sentence
`POST /v1/cards/{id}/use-it` with `{ sentence }` (1–300 characters) SHALL ask the AI task to judge the sentence and answer `200` with `{ good, lines, movedUp, stage }`. `lines` are 1–4 short Kai lines. When `good` is true and the stage is under 5, the card moves up one stage and `movedUp` is true. A weak sentence changes nothing. If the AI call fails the answer is `502` and nothing changes. Another user's card answers `404`.

#### Scenario: Good sentence
- **WHEN** the owner sends a good sentence for a stage 1 card
- **THEN** `good` is true, `movedUp` is true and `stage` is 2

#### Scenario: Weak sentence
- **WHEN** the sentence does not use the word
- **THEN** `good` is false, `movedUp` is false and the stage is unchanged

#### Scenario: AI fails
- **WHEN** the AI task throws
- **THEN** the answer is `502` with `{ "error": "check_failed" }` and the stage is unchanged
