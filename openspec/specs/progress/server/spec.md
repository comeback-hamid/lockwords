# progress/server Specification

## Purpose
The numbers of the Progress tab: how many words the learner has, how well they know them, their goal and the date they reach it.

## Requirements

### Requirement: Progress numbers
`GET /v1/progress` SHALL answer `200` with `{ total, new, learning, mastered, decks, goal, masterBy, grid }` for the caller's words (not removed, in ready decks). `new` = stage 0 and not known; `learning` = stage 1 to 4 and not known; `mastered` = stage 5 or known. `decks` is the number of ready decks. `grid` has the stage of every word that is not known, highest first.

#### Scenario: Counts
- **WHEN** a user has 10 words: 4 new, 3 at stage 2, 2 at stage 5 and 1 known
- **THEN** `total` is 10, `new` 4, `learning` 3, `mastered` 3, and `grid` is `[5, 5, 2, 2, 2, 0, 0, 0, 0]`

#### Scenario: No words
- **WHEN** a user has no decks
- **THEN** every count is 0 and `grid` is empty

#### Scenario: Removed words
- **WHEN** a word or its deck is removed
- **THEN** it is in no count

### Requirement: Goal and date
`goal` SHALL be the next multiple of 100 strictly above the number of words that are not known. `masterBy` is a date (`YYYY-MM-DD`): today's review day plus the days to start the words still missing for the goal at the learner's pace, plus 24 days. The pace is the new words started per day over the last 7 review days, at least 5 and at most 20.

#### Scenario: Goal
- **WHEN** the user has 52 words to learn
- **THEN** `goal` is 100

#### Scenario: Exactly a hundred
- **WHEN** the user has 100 words to learn
- **THEN** `goal` is 200

#### Scenario: Date
- **WHEN** today is 2026-11-20, the goal is 100, 30 words are started and the pace is 10 a day
- **THEN** `masterBy` is 2026-12-21 (7 days to start 70 words, plus 24 days)

#### Scenario: No history
- **WHEN** the user started no word in the last 7 days
- **THEN** the pace is 5 a day

### Requirement: Language and trees
`GET /v1/progress` SHALL also answer `language`, the English name of the language being learned ("Spanish"; empty with no profile), and `trees`: one list per ready deck, oldest deck first, with the stage of each of its words that is met (stage 1 or higher, a known word counts as 5), highest first.

#### Scenario: Two decks
- **WHEN** the older deck has words at stage 2 and 5 and eight new words, and the newer deck has only new words
- **THEN** `trees` is `[[5, 2], []]`

#### Scenario: Language
- **WHEN** the profile says the learner learns `es`
- **THEN** `language` is "Spanish"
