## ADDED Requirements

### Requirement: Removed decks and words in the chat
A chat message SHALL NOT list a removed deck in its `decks`. The message itself stays. What Kai is told about the learner's words and decks (counts, sample words, deck topics) SHALL NOT count removed cards or removed decks. The "deck ready" event for a removed deck answers `404`.

#### Scenario: A removed deck leaves the chat
- **WHEN** a user removes a deck that a chat message showed and reads the chat
- **THEN** the message is still there and its `decks` does not have that deck

#### Scenario: Kai's word facts
- **WHEN** a user with 10 words removes 3
- **THEN** Kai is told the learner has 7 words, and none of the 3 is in the sample

#### Scenario: Kai's deck topics
- **WHEN** a user removes a deck
- **THEN** its topic is not in the topics Kai is told the learner has
