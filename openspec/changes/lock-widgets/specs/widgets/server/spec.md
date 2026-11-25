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
`GET /v1/widget/plan` SHALL answer `200` with `{ slots, endsAt }` for the signed-in learner: the slots of the next 48 hours and the end of the last slot. A slot has `at`, `cardId`, `word`, `translation` and `look` (1 to 5). Only hard words are in the plan. The server keeps the plan to count looks. The call carries the learner's time zone. Without a valid token the answer is `401`.

#### Scenario: Turns
- **WHEN** the learner has 8 hard words with 0 looks
- **THEN** the first 6 words in the order take turns, one slot each, and the 7th word first shows in the slot after one of them had its 5th look

#### Scenario: One word
- **WHEN** the learner has one hard word
- **THEN** every slot is that word with looks 1 to 5, and after the 5th a new lap starts at look 1

#### Scenario: No hard words
- **WHEN** the learner has cards but none is hard
- **THEN** `slots` is empty

### Requirement: Widget order
The plan SHALL hold only hard cards (the hard mark of the Review rules) that are not known and not removed. Up to 6 words take turns: the words whose looks have started, filled up with the oldest waiting cards. In the group the word with the fewest looks is next, then the oldest card. When every hard word has 5 looks, a new lap starts and every word counts from 0 again.

#### Scenario: The plan is made again
- **WHEN** the learner has 12 hard words and the plan is asked for again every half hour
- **THEN** the same 6 words keep their turns until one of them has 5 looks

#### Scenario: Not hard
- **WHEN** the learner has a hard word and a word due today that is not hard
- **THEN** every slot is the hard word

#### Scenario: No longer hard
- **WHEN** a word in the kept plan reaches Stage 3 or is swiped I know it, and the plan is asked for again
- **THEN** no slot has that word
