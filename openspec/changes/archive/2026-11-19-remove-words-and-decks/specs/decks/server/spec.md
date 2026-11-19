## ADDED Requirements

### Requirement: Remove a card
`DELETE /v1/cards/{id}` SHALL remove the caller's card and answer `204`. The card is no longer in its deck's `cards`, and the deck's `wordCount` is the number of cards left. Another user's card, an unknown id, and a card that is already removed answer `404`.

#### Scenario: Remove a word
- **WHEN** the owner removes one card of a ready deck of 10
- **THEN** the answer is `204`, and reading the deck gives 9 cards and `wordCount: 9`

#### Scenario: Someone else's card
- **WHEN** user B removes user A's card
- **THEN** the answer is `404` and user A's deck still has the card

#### Scenario: Twice
- **WHEN** the owner removes the same card a second time
- **THEN** the answer is `404`

### Requirement: Remove a deck
`DELETE /v1/decks/{id}` SHALL remove the caller's deck and all its cards and answer `204`. After that every deck route answers `404` for that id. Another user's deck, an unknown id, and a removed deck answer `404`. A deck in state `generating` answers `409` with `{ "error": "deck_generating" }` and nothing changes.

#### Scenario: Remove a deck
- **WHEN** the owner removes a ready deck
- **THEN** the answer is `204`, and reading the deck answers `404`

#### Scenario: Someone else's deck
- **WHEN** user B removes user A's deck
- **THEN** the answer is `404` and user A can still read the deck

#### Scenario: Being made
- **WHEN** the owner removes a deck whose status is `generating`
- **THEN** the answer is `409` with `deck_generating`, and the deck is still there

#### Scenario: An idea
- **WHEN** the owner removes a `proposed` deck
- **THEN** the answer is `204`, and generate for that id answers `404`

### Requirement: Random Words decks after a removal
Random Words decks SHALL lose words and be removed like any deck. A random deck has room when it has fewer than 30 cards that are not removed. A removed random deck never takes a word. The number of a new random deck counts every random deck the user ever had, removed ones too. A word that was removed does not count as "already in your words".

#### Scenario: Room again
- **WHEN** "Random Words 1" has 30 cards, the user removes one and adds a new word
- **THEN** the word goes to "Random Words 1", which has 30 cards again

#### Scenario: Deck removed
- **WHEN** the user removes "Random Words 1" and adds a new word
- **THEN** a deck "Random Words 2" is made with that one card

#### Scenario: Add a removed word again
- **WHEN** the user removes a word and Kai gives a new word card with the same word, and the user adds it
- **THEN** the word is added (`already` is false)
