## ADDED Requirements

### Requirement: Kai offers decks
A Kai answer SHALL be able to carry 1 or 3 deck ideas, each with `topic` (1–80 characters), `title` in the learning language, `titleTranslation` in the native language, `reason` (at most 30 characters) and `wordCount` (10 to 30, chosen by Kai for that deck). The server SHALL save each idea as the caller's deck in state `proposed`, with the profile's CEFR level, and link them to Kai's last line of that turn. Any other number of ideas is treated as a failed AI call.

#### Scenario: Three ideas
- **WHEN** the AI answers a turn with 3 deck ideas
- **THEN** the caller has 3 new `proposed` decks, and the turn's last Kai message has them in `decks`

#### Scenario: Own idea
- **WHEN** the user asked for a deck about a coffee shop job and the AI answers with 1 idea
- **THEN** the caller has 1 new `proposed` deck with that topic

#### Scenario: Size
- **WHEN** the AI answers with ideas of 12, 20 and 30 words
- **THEN** the three decks have `wordCount` 12, 20 and 30

#### Scenario: Bad size
- **WHEN** an idea has `wordCount` 5 or 40
- **THEN** nothing is saved and the turn fails as "Kai fails safely" says

#### Scenario: A text that is too long
- **WHEN** an idea has a `topic` of 95 characters or a `reason` of 40
- **THEN** the text is cut at a word to fit its limit, and the turn does not fail

#### Scenario: Two ideas
- **WHEN** the AI answers with 2 ideas
- **THEN** nothing is saved and the turn fails as "Kai fails safely" says

### Requirement: Decks in chat messages
A chat message that has deck cards SHALL have `decks`: a list of `{ id, title, titleTranslation, reason, cefr, wordCount, status, current }`. A message with no deck cards (most messages) has no `decks` field. `status` is the deck's status now. `current` is true only for decks of the newest message that has decks.

#### Scenario: Status follows the deck
- **WHEN** a deck offered in the chat becomes `ready` and the user reads the chat
- **THEN** that message's deck has `status: "ready"`

#### Scenario: No decks
- **WHEN** the user reads a message Kai sent with no ideas
- **THEN** the message has no `decks` field

#### Scenario: Older ideas
- **WHEN** Kai offered 3 ideas, then later 3 new ones
- **THEN** the first 3 have `current: false` and the new 3 have `current: true`

### Requirement: When Kai offers
The AI SHALL be told: how many new words (stage 0) the learner has left, the topics of their decks and of ideas already offered, and these rules: on the first visit ask before showing ideas; later offer ideas only when the learner asks or has fewer than 10 new words left; never repeat a topic; for the learner's own idea ask at most one short question first; say now and then that the learner can ask for their own deck.

#### Scenario: Prompt carries the facts
- **WHEN** the prompt is built for a user with 4 new words left and a deck "Ordering food"
- **THEN** it holds the number 4, the topic "Ordering food" and the offer rules

### Requirement: Kai picks the deck size
The AI SHALL be told to pick each deck's size, from 10 to 30 words, by how wide the topic is and what the learner asked for, and that a deck for a beginner is small.

#### Scenario: Prompt carries the size rule
- **WHEN** the prompt is built for any turn
- **THEN** it holds the limits 10 and 30 and the size rule

### Requirement: Deck is ready
`POST /v1/kai/chat/turns` with `{ event: "deck_ready", deckId }` SHALL make a Kai turn that tells the learner the deck is ready and in Review. The deck must be the caller's and `ready`. The event is answered once per deck: a second one answers `200` with no messages.

#### Scenario: Ready
- **WHEN** the owner sends the event for a deck that just became ready
- **THEN** the answer is `200` with Kai's lines, and the AI was told which deck is ready

#### Scenario: Twice
- **WHEN** the same event is sent again
- **THEN** the answer is `200` with no messages and nothing new is saved

#### Scenario: Not ready or not mine
- **WHEN** the deck is still `generating`, or belongs to another user
- **THEN** the answer is `409` for the first and `404` for the second
