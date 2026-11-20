## ADDED Requirements

### Requirement: A round for one deck
`GET /v1/review?deckId=<id>` SHALL answer today's round with only the cards of that deck. The review day and the daily limit of new words are the same as for the full round. A deck that is not the caller's gives an empty round.

#### Scenario: One deck
- **WHEN** a user with two decks of 10 new words asks for the round of the second deck
- **THEN** the 10 cards of the second deck come back

#### Scenario: Limit reached
- **WHEN** the user already started 20 new words today
- **THEN** the deck's round has no new card
