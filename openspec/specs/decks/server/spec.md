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
`POST /v1/decks/{id}/generate` SHALL start a background job that fills the caller's proposed deck with exactly `wordCount` cards, and wait up to 20 seconds for it. While the job runs the deck's `status` is `generating`. The answer is `200` with the deck as it is now (`ready` or `generating`). Each card has `word`, `translation`, `example`, `exampleTranslation` and `stage` 0. If the AI fails, the answer is `502` with `{ "error": "generation_failed" }` and nothing is saved.

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

### Requirement: Retry a fast failure
If the first AI try for a deck's cards fails in under 12 seconds, the job SHALL try once more. The words SHALL fit the learner's deck band, goal and interests (see "Deck band" and "Deck words fit the learner").

#### Scenario: Fast failure, then success
- **WHEN** the first AI try fails at once and the second returns 10 good cards
- **THEN** the deck is `ready` with those 10 cards

#### Scenario: Slow failure
- **WHEN** the first AI try fails after more than 12 seconds
- **THEN** there is no second try, and the deck goes back to `proposed`

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

### Requirement: Deck band
The server SHALL give each deck a band from 0 to 4 from the profile's level and word-test result (`knownWords`), as `docs/vocab-engine.md` 2.1 says. Level `brand_new` is band 0. Otherwise a test result wins: under 500 → 1, under 1,500 → 2, under 3,250 → 3, else 4. With no result: `beginner` → 1, `some_basics` → 2, `intermediate` → 3, `advanced` → 4.

#### Scenario: Bands
- **WHEN** the profile is (`brand_new`, 2000), (`advanced`, 400), (`beginner`, 1499), (`some_basics`, 3249), (`beginner`, 3250), (`intermediate`, null), (`advanced`, null)
- **THEN** the bands are 0, 1, 2, 3, 4, 3, 4

### Requirement: Deck words fit the learner
The AI task that makes the cards SHALL receive the learning language, native language, self-rated level, test result, goal (and the learner's own words for "other"), interests, the topic as the learner wrote or tapped it, and the band's text from `docs/vocab-engine.md` 2.2. The model is Claude Sonnet 5.5.

#### Scenario: Learner block
- **WHEN** a learner with goal `other` ("for my wife") and interests `food`, `music` asks for "Ordering food"
- **THEN** the prompt holds "for my wife", "food, music" and "Ordering food"

### Requirement: Mix and measured size
For bands 1–4 the prompt SHALL also hold the easy / at-level / stretch mix (about 3 / 5 / 2). For bands 3–4 it SHALL also hold the measured size ("about N of the 5,000 most common words", or "nearly all" at 5,000).

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
