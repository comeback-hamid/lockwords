# review/server Specification

## Purpose
The server rules for reviewing cards: which cards are in today's round and what each swipe does.

## Requirements

### Requirement: Today's round
`GET /v1/review` SHALL answer `200` with `{ cards }`: the caller's due cards (stage 1–5, not known) oldest due first, then new cards (stage 0, not known) oldest deck first. At most 20 new cards are started per review day: the round offers 20 minus the new cards already swiped today. Each card has `id`, `deckId`, `deckTopic`, `word`, `translation`, `example`, `exampleTranslation`, `stage`. Only cards of the caller's ready decks are listed.

#### Scenario: New deck
- **WHEN** a user with one ready deck of 10 new cards calls it
- **THEN** the 10 cards come back in deck order

#### Scenario: After swiping
- **WHEN** the user swiped 3 cards Easy today
- **THEN** those 3 are not in the list

#### Scenario: More than 20 new cards
- **WHEN** the user has 30 new cards
- **THEN** 20 come back

#### Scenario: Daily limit reached
- **WHEN** the user has 30 new cards and swiped 20 of them today
- **THEN** no new card comes back today, and the other 10 come back on the next review day

### Requirement: Easy swipe
`POST /v1/cards/{id}/swipe` with `{ "direction": "easy" }` SHALL move a new card (stage 0) to stage 2 and any other card up one stage (5 at most), and set it due after 1, 3, 7, 14 or 30 days for stage 1 to 5. The answer is `200` with `{ id, stage, known, hard, backInDays, again }`. `again` is false for Easy.

#### Scenario: New card
- **WHEN** a stage 0 card is swiped Easy
- **THEN** `stage` is 2 and `backInDays` is 3

#### Scenario: Stage 1 card
- **WHEN** a due stage 1 card is swiped Easy
- **THEN** `stage` is 2 and `backInDays` is 3

#### Scenario: Top stage
- **WHEN** a due stage 5 card is swiped Easy
- **THEN** `stage` stays 5 and `backInDays` is 30

### Requirement: Hard swipe
A swipe with `"direction": "hard"` SHALL set the card to stage 1, due in 1 day, and mark it hard. The first Hard swipe of a card on a review day answers `again: true`: the card is shown once more in the same round and accepts one more swipe that day. A second Hard that day answers `again: false`.

#### Scenario: Hard
- **WHEN** a due stage 4 card is swiped Hard
- **THEN** `stage` is 1, `hard` is true, `backInDays` is 1 and `again` is true

#### Scenario: Second showing, Easy
- **WHEN** that card is swiped Easy later the same day
- **THEN** `stage` is 2, `backInDays` is 3 and `hard` is still true

#### Scenario: Second showing, Hard
- **WHEN** that card is swiped Hard again the same day
- **THEN** `stage` is 1, `again` is false, and a third swipe that day answers `409`

### Requirement: I know it swipe
A swipe with `"direction": "known"` SHALL mark the card known. A known card is never in a round again and is not hard. The hard mark of any other card stays until the card reaches stage 3 or higher.

#### Scenario: Known
- **WHEN** a card is swiped I know it
- **THEN** `known` is true, `hard` is false and the card is not in `GET /v1/review` any more

#### Scenario: Hard word leaves the lock screen
- **WHEN** a hard card at stage 2 is swiped Easy
- **THEN** `stage` is 3 and `hard` is false

#### Scenario: Hard word stays
- **WHEN** a hard card at stage 1 is swiped Easy
- **THEN** `stage` is 2 and `hard` is still true

### Requirement: Cards are private
A swipe on another user's card or an unknown id SHALL answer `404`. A bad direction answers `400`. A swipe on a card that is not in today's round (not due, over the daily new-card limit, or already swiped today) answers `409` with `{ "error": "not_due" }`. None of these changes anything.

#### Scenario: Someone else's card
- **WHEN** user B swipes user A's card
- **THEN** the answer is `404` and the card is unchanged

#### Scenario: Double send
- **WHEN** the same Easy swipe is sent twice
- **THEN** the second answer is `409` and the card moved up only once

#### Scenario: Not due
- **WHEN** a card that is due in 5 days is swiped
- **THEN** the answer is `409` and the card is unchanged

### Requirement: Hard words list
`GET /v1/hard-words` SHALL answer `200` with `{ words }`: the caller's hard cards that are not known, newest first, 20 at most, each with `word` and `translation`.

#### Scenario: After a hard swipe
- **WHEN** the user swiped "la propina" Hard
- **THEN** `words` has `{ word: "la propina", translation: "the tip" }`

### Requirement: Removed cards stay out
A removed card, and every card of a removed deck, SHALL never be in today's round or in the hard words list. Swipe and Use it with its id answer `404`.

#### Scenario: Round
- **WHEN** a user with 10 new cards removes one and reads today's round
- **THEN** the round has 9 cards and not the removed one

#### Scenario: Deck removed
- **WHEN** a user removes their only deck and reads today's round
- **THEN** the round is empty

#### Scenario: Hard words
- **WHEN** a user swipes a card Hard and then removes it
- **THEN** the hard words list does not have it

#### Scenario: Swipe a removed card
- **WHEN** a user swipes a card they removed
- **THEN** the answer is `404`

### Requirement: Review day
The server SHALL count days as review days: the local date, in the caller's time zone, of the current time minus 4 hours. The time zone comes from the header `X-Time-Zone` (an IANA name). A missing or unknown zone means UTC. A card is due when its due time is before the end of today's review day.

#### Scenario: Late evening swipe
- **WHEN** a card is swiped Easy to "back in 1 day" at 23:00 local time, and the user opens Review at 08:00 the next morning
- **THEN** the card is in today's round

#### Scenario: After midnight
- **WHEN** it is 02:00 local time
- **THEN** the review day is still yesterday's date

#### Scenario: No time zone
- **WHEN** the header is missing
- **THEN** the review day is counted in UTC

### Requirement: Review history
Every accepted swipe SHALL be saved as one row in `review_events` with the user, the card, the kind (`easy`, `hard` or `known`), the review day, and the card's state before and after. The card and its event are saved together or not at all.

#### Scenario: One swipe
- **WHEN** a user swipes a new card Easy
- **THEN** one event exists with kind `easy`, before stage 0 and after stage 2

#### Scenario: Refused swipe
- **WHEN** a swipe is refused
- **THEN** no event is saved
