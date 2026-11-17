## ADDED Requirements

### Requirement: Random Words decks
A deck SHALL have `kind`: `topic` or `random`. Random decks are titled "Random Words N" (N from 1), are always `ready`, and hold at most 30 cards. A single word goes to the caller's newest random deck that has fewer than 30 cards. When there is none, a new one is made with the next number. Their cards join Review like any new card.

#### Scenario: Full deck
- **WHEN** "Random Words 1" has 30 cards and the user adds a word
- **THEN** "Random Words 2" exists with that one card, and "Random Words 1" still has 30

#### Scenario: Two taps at once
- **WHEN** two add requests for different words arrive together for a user with no random deck
- **THEN** there is one deck "Random Words 1" with both cards

#### Scenario: In Review
- **WHEN** a word was added to a random deck and the user has no other new words
- **THEN** today's round has that card

#### Scenario: Read
- **WHEN** the owner reads a random deck
- **THEN** the answer has `kind: "random"`, the title and its cards in the order they were added
