## MODIFIED Requirements

### Requirement: Make the cards
`POST /v1/decks/{id}/generate` SHALL start a background job that fills the caller's proposed deck with exactly 10 cards, and wait up to 20 seconds for it. While the job runs the deck's `status` is `generating`. A finished job answers `200` with the deck in state `ready`; a job that is still running answers `200` with the deck in state `generating`. Each card has `word`, `translation`, `example`, `exampleTranslation` and `stage` 0. The words SHALL fit the learner's deck band, goal and interests (see "Deck band" and "Deck words fit the learner"). If the first AI try fails in under 12 seconds, the job SHALL try once more. If the AI fails, the answer is `502` with `{ "error": "generation_failed" }` and nothing is saved.

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
- **WHEN** the AI task throws or returns fewer than 10 valid cards, twice
- **THEN** the answer is `502`, the deck goes back to `proposed` and has no cards

#### Scenario: Fast failure, then success
- **WHEN** the first AI try fails at once and the second returns 10 good cards
- **THEN** the deck is `ready` with those 10 cards

#### Scenario: Slow failure
- **WHEN** the first AI try fails after more than 12 seconds
- **THEN** there is no second try, and the deck goes back to `proposed`

## ADDED Requirements

### Requirement: Deck band
The server SHALL give each deck a band from 0 to 4 from the profile's level and word-test result (`knownWords`), as `docs/vocab-engine.md` 2.1 says. Level `brand_new` is band 0. Otherwise a test result wins: under 500 → 1, under 1,500 → 2, under 3,250 → 3, else 4. With no result: `beginner` → 1, `some_basics` → 2, `intermediate` → 3, `advanced` → 4.

#### Scenario: Bands
- **WHEN** the profile is (`brand_new`, 2000), (`advanced`, 400), (`beginner`, 1850), (`some_basics`, 3249), (`beginner`, 3250), (`intermediate`, null), (`advanced`, null)
- **THEN** the bands are 0, 1, 2, 3, 4, 3, 4

### Requirement: Deck words fit the learner
The AI task that makes the cards SHALL receive the learning language, native language, self-rated level, test result, goal (and the learner's own words for "other"), interests, the topic as the learner wrote or tapped it, and the band's text from `docs/vocab-engine.md` 2.2. For bands 1–4 it also gets the easy / at-level / stretch mix (about 3 / 5 / 2). For bands 3–4 it also gets the measured size ("about N of the 5,000 most common words", or "nearly all" at 5,000). The model is Claude Sonnet 5.5.

#### Scenario: Advanced learner
- **WHEN** a learner with level `intermediate`, `knownWords` 4700, goal `travel` and interests `food`, `music` asks for "Ordering food"
- **THEN** the prompt holds the band 4 text, the mix, "about 4,700 of the 5,000", "travel", "food, music" and "Ordering food"

#### Scenario: Starting from zero
- **WHEN** a `brand_new` learner asks for a deck
- **THEN** the prompt holds the band 0 text and no mix and no measured size

### Requirement: The AI answer is checked
Before saving, the server SHALL drop items with no word, translation or example, drop duplicate words (ignoring case), and remove the asterisks around the word in the example. Fewer than 10 items left is a failed try. More than 10 keeps the first 10.

#### Scenario: Duplicates and asterisks
- **WHEN** the model returns 11 items, one a duplicate of another in other case, and examples like "Quiero *pedir* una sopa."
- **THEN** 10 cards are saved, and the example is "Quiero pedir una sopa."

#### Scenario: Too few
- **WHEN** the model returns 10 items and 2 have no translation
- **THEN** the try failed
