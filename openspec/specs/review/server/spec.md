# review/server Specification

## Purpose
The server rules for reviewing cards: which cards are in today's round and what each swipe does.

## Requirements

### Requirement: Today's round
`GET /v1/review` SHALL answer `200` with `{ cards }`: the caller's due cards (stage 1–5, due now or earlier, not known) oldest due first, then new cards (stage 0, not known) oldest deck first, with at most 20 new cards. Each card has `id`, `deckId`, `deckTopic`, `word`, `translation`, `example`, `exampleTranslation`, `stage`. Only cards of ready decks of the caller are listed.

#### Scenario: New deck
- **WHEN** a user with one ready deck of 10 new cards calls it
- **THEN** the 10 cards come back in deck order

#### Scenario: After swiping
- **WHEN** the user swiped 3 cards Easy today
- **THEN** those 3 are not in the list (they are due later)

#### Scenario: More than 20 new cards
- **WHEN** the user has 30 new cards
- **THEN** 20 come back

### Requirement: Easy swipe
`POST /v1/cards/{id}/swipe` with `{ "direction": "easy" }` SHALL move the card up one stage (5 at most) and set it due after 1, 3, 7, 14 or 30 days for stage 1 to 5. The answer is `200` with `{ id, stage, known, hard, backInDays }`.

#### Scenario: New card
- **WHEN** a stage 0 card is swiped Easy
- **THEN** `stage` is 1 and `backInDays` is 1

#### Scenario: Top stage
- **WHEN** a stage 5 card is swiped Easy
- **THEN** `stage` stays 5 and `backInDays` is 30

### Requirement: Hard swipe
A swipe with `"direction": "hard"` SHALL set the card to stage 1, due in 1 day, and mark it hard.

#### Scenario: Hard
- **WHEN** a stage 4 card is swiped Hard
- **THEN** `stage` is 1, `hard` is true and `backInDays` is 1

### Requirement: I know it swipe
A swipe with `"direction": "known"` SHALL mark the card known. A known card is never in a round again. An Easy swipe clears the hard mark; a known card is not hard.

#### Scenario: Known
- **WHEN** a card is swiped I know it
- **THEN** `known` is true and the card is not in `GET /v1/review` any more

### Requirement: Cards are private
A swipe on another user's card, an unknown id, or a bad direction SHALL change nothing. The first two answer `404`, a bad direction `400`.

#### Scenario: Someone else's card
- **WHEN** user B swipes user A's card
- **THEN** the answer is `404` and the card is unchanged

### Requirement: Hard words list
`GET /v1/hard-words` SHALL answer `200` with `{ words }`: the caller's hard cards that are not known, newest first, 20 at most, each with `word` and `translation`.

#### Scenario: After a hard swipe
- **WHEN** the user swiped "la propina" Hard
- **THEN** `words` has `{ word: "la propina", translation: "the tip" }`
