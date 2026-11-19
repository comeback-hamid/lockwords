## ADDED Requirements

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
