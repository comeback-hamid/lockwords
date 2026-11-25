## ADDED Requirements

### Requirement: Looks
The server SHALL count a look for a word for every 30-minute widget slot of that word whose end has passed. Slots exist only from 07:00 to 23:00 in the learner's time zone. A word is done for the lap after 5 looks. Looks SHALL never change a card's stage, due date, hard mark or known mark. A Hard swipe on a card sets its looks to 0.

#### Scenario: A slot passed
- **WHEN** the kept plan has a slot for a word from 09:00 to 09:30 and the plan is asked for again at 09:40
- **THEN** that word has one more look, and asking again at 09:45 adds nothing

#### Scenario: Night
- **WHEN** a plan is made at 22:50
- **THEN** it has one slot until 23:00 and the next slot starts at 07:00 the next day

#### Scenario: Swiped Hard again
- **WHEN** a word with 4 looks is swiped Hard
- **THEN** it has 0 looks and is hard

#### Scenario: SRS untouched
- **WHEN** a word gets its 5th look
- **THEN** its stage, due date and hard mark are what they were

### Requirement: Widget plan
`GET /v1/widget/plan` SHALL answer `200` with `{ slots, due, endsAt }` for the signed-in learner: the slots of the next 48 hours, the number of cards in today's round, and the end of the last slot. A slot has `at`, `cardId`, `word`, `translation`, `hard` and `look` (1 to 5). The server keeps the plan to count looks. The call carries the learner's time zone. Without a valid token the answer is `401`.

#### Scenario: Turns
- **WHEN** the learner has 8 words with 0 looks
- **THEN** the first 6 words in the order take turns, one slot each, and the 7th word first shows in the slot after one of them had its 5th look

#### Scenario: One word
- **WHEN** the learner has one word
- **THEN** every slot is that word with looks 1 to 5, and after the 5th a new lap starts at look 1

#### Scenario: No words
- **WHEN** the learner has no cards
- **THEN** `slots` is empty and `due` is 0

### Requirement: Widget order
The plan SHALL take words in this order: hard words (fewest looks first, then the oldest card), then cards in review by the nearest due date, then new cards in deck order (oldest deck first). Cards marked known or removed are never in the plan. When every word in the order has 5 looks, a new lap starts and every word counts from 0 again.

#### Scenario: Hard first
- **WHEN** the learner has a hard word and a word due today that is not hard
- **THEN** the hard word has the first slot

#### Scenario: Known word
- **WHEN** a word in the kept plan is swiped I know it and the plan is asked for again
- **THEN** no slot has that word
