## ADDED Requirements

### Requirement: Deck list
`GET /v1/decks` SHALL answer `200` with `{ decks }`: the caller's ready decks that are not removed, newest first. Each has `id`, `topic`, `title`, `kind`, `words`, `learning`, `hard` and `stages` (the stage of each word, highest first; a known word counts as 5).

#### Scenario: Two decks
- **WHEN** a user has an older deck of 10 new words and a newer deck with 2 words at stage 2
- **THEN** the newer deck is first, with `learning` 2, and the older deck has `words` 10 and `learning` 0

#### Scenario: Someone else's decks
- **WHEN** another user calls it
- **THEN** none of these decks is in their list

### Requirement: Card flags on a deck
The cards of `GET /v1/decks/{id}` SHALL have `hard: true` when the word is hard and `known: true` when it was marked "I know it". Other cards have neither field.

#### Scenario: Hard word
- **WHEN** a word was swiped Hard
- **THEN** its card in the deck has `hard: true`

### Requirement: Restore a known word
`POST /v1/cards/{id}/restore` SHALL bring back a card marked "I know it": it is not known any more, and a card with stage 1 or higher is due today. The answer is `200` with `{ id, stage, known: false }`. A card that is not known answers `409` with `{ "error": "not_known" }`. Another user's card, an unknown id or a removed card answers `404`.

#### Scenario: Restore
- **WHEN** a user restores a stage 2 word they marked "I know it"
- **THEN** it is in today's round again

#### Scenario: Not known
- **WHEN** the card is not known
- **THEN** the answer is `409` and nothing changes
