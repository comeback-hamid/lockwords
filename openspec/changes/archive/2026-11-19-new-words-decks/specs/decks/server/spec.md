## ADDED Requirements

### Requirement: Deck size
A deck SHALL have `wordCount`: how many cards it gets when it is made. It is 10 for a deck proposed with `POST /v1/decks` (onboarding) and 10 to 30 for a deck Kai offers in the New words chat. Every answer that returns a deck includes it.

#### Scenario: Onboarding deck
- **WHEN** a user proposes a deck with `POST /v1/decks`
- **THEN** `wordCount` is 10

#### Scenario: Chat deck
- **WHEN** the owner reads a proposed deck Kai offered with 20 words
- **THEN** `wordCount` is 20 and there are no cards yet

### Requirement: Title translation
A deck SHALL have `titleTranslation`: the title in the user's native language, or null when the deck has none. Every answer that returns a deck includes it.

#### Scenario: A deck from the chat
- **WHEN** the owner reads a deck that Kai offered with the title "Pedir comida" and the translation "Ordering food"
- **THEN** the answer has `title: "Pedir comida"` and `titleTranslation: "Ordering food"`

#### Scenario: An older deck
- **WHEN** the owner reads a deck made in onboarding
- **THEN** `titleTranslation` is null

## MODIFIED Requirements

### Requirement: Make the cards
`POST /v1/decks/{id}/generate` SHALL start a background job that fills the caller's proposed deck with exactly `wordCount` cards, and wait up to 20 seconds for it. While the job runs the deck's `status` is `generating`. The answer is `200` with the deck in its current state (`ready`, or `generating` if the job still runs). Each card has `word`, `translation`, `example`, `exampleTranslation` and `stage` 0. If the AI fails, the answer is `502` with `{ "error": "generation_failed" }` and nothing is saved.

#### Scenario: Generate
- **WHEN** the owner calls generate on a proposed deck of 10 and the job finishes in time
- **THEN** the answer is `200`, `status` is `ready`, and there are 10 cards in order, each with `stage: 0`

#### Scenario: A bigger deck
- **WHEN** the owner calls generate on a proposed deck with `wordCount` 24
- **THEN** the ready deck has exactly 24 cards

#### Scenario: Slow job
- **WHEN** the job is still running after the wait
- **THEN** the answer is `200` with `status` `generating` and no cards, and reading the deck later shows `ready` with all its cards

#### Scenario: Generate twice
- **WHEN** the owner calls generate again, on a ready deck or while the job runs
- **THEN** no second job starts and the deck never has more than `wordCount` cards

#### Scenario: AI fails
- **WHEN** the AI task throws or returns fewer valid cards than `wordCount`, twice
- **THEN** the answer is `502`, the deck goes back to `proposed` and has no cards
