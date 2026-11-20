## ADDED Requirements

### Requirement: Meaning for high levels
When the learner's deck band is the top one (B2–C1), the deck maker SHALL ask for a `meaning` for every word: one short definition in the language being learned. It is saved with the card and sent as `meaning` in `GET /v1/decks/{id}` and `GET /v1/review`. For lower bands a card has no `meaning`. A meaning that is missing, longer than 140 characters, or that repeats the word itself is not saved; the card is kept.

#### Scenario: Advanced learner
- **WHEN** a learner in the top band makes a deck
- **THEN** every card has a `meaning` in the learned language, and a `translation`

#### Scenario: Beginner
- **WHEN** a beginner makes a deck
- **THEN** no card has a `meaning`

#### Scenario: Bad meaning
- **WHEN** the AI returns a meaning that repeats the word itself
- **THEN** the card is saved without a `meaning`
