# decks/server Specification

## Purpose
How the server proposes and makes decks of words for a user, and returns them.

## Requirements

### Requirement: Deck ideas
`GET /v1/deck-ideas` SHALL answer `200` with `{ ideas }`: four different short topics chosen for the goal in the caller's profile. With no profile it answers the ideas for `travel`.

#### Scenario: Travel goal
- **WHEN** a user whose goal is `travel` calls `GET /v1/deck-ideas`
- **THEN** `ideas` is `["Ordering food", "Getting around the city", "Meeting new people", "At the hotel"]`

#### Scenario: Other goals
- **WHEN** users with each of the seven goals call it
- **THEN** each gets four different, non-empty ideas

### Requirement: Propose a deck
`POST /v1/decks` with `{ topic }` (1–80 characters) SHALL create a deck for the caller in state `proposed` and answer `201` with `{ id, topic, title, cefr, reason, wordCount, status, cards }`, where `wordCount` is 10 and `cards` is empty. `cefr` comes from the profile (or `A1`). The caller's profile must exist.

#### Scenario: Propose
- **WHEN** a user with a profile sends `{ "topic": "Ordering food" }`
- **THEN** the answer is `201` with `status: "proposed"`, `wordCount: 10`, a non-empty `title`, and no cards

#### Scenario: No profile
- **WHEN** a user with no profile sends a topic
- **THEN** the answer is `409` with `{ "error": "no_profile" }`

#### Scenario: Bad topic
- **WHEN** `topic` is empty or longer than 80 characters
- **THEN** the answer is `400`

### Requirement: Make the cards
`POST /v1/decks/{id}/generate` SHALL fill the caller's proposed deck with exactly 10 cards and answer `200` with the deck in state `ready`. Each card has `word`, `translation`, `example`, `exampleTranslation` and `stage` 0. Calling it again on a ready deck returns the same deck and makes no new cards. If the AI call fails, the answer is `502` with `{ "error": "generation_failed" }` and nothing is saved.

#### Scenario: Generate
- **WHEN** the owner calls generate on a proposed deck
- **THEN** the answer is `200`, `status` is `ready`, and there are 10 cards in order, each with `stage: 0`

#### Scenario: Generate twice
- **WHEN** the owner calls generate again
- **THEN** the same 10 cards come back and the deck still has 10 cards

#### Scenario: AI fails
- **WHEN** the AI task throws or returns fewer than 10 valid cards
- **THEN** the answer is `502`, the deck stays `proposed` and has no cards

### Requirement: Read a deck
`GET /v1/decks/{id}` SHALL answer `200` with the deck and its cards in order.

#### Scenario: Read
- **WHEN** the owner reads a ready deck
- **THEN** the answer has the deck fields and its 10 cards

### Requirement: Decks are private
A user SHALL only reach their own decks. Any deck route with another user's deck id, or an unknown id, answers `404`.

#### Scenario: Someone else's deck
- **WHEN** user B calls read or generate with user A's deck id
- **THEN** the answer is `404` and nothing changes
