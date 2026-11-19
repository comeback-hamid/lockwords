## ADDED Requirements

### Requirement: Kai answers with a word card
A Kai answer SHALL be able to carry one word: `word` (1–60 characters, in the learning language), `translation` (in the native language), `example` (one sentence in the learning language that uses the word) and `exampleTranslation`. The server saves it with Kai's last line of the turn. That message then has `word` with these four fields plus `addTo` (the title of the Random Words deck that would take it now) and `added` (true once it was added).

#### Scenario: How do I say
- **WHEN** the user asks how to say "to go" for food and the AI answers with the word "para llevar"
- **THEN** the turn's last Kai message has `word.word: "para llevar"`, `word.addTo: "Random Words 1"` and `word.added: false`

#### Scenario: Missing a field
- **WHEN** the AI returns a word with no example
- **THEN** nothing is saved and the turn fails as "Kai fails safely" says

### Requirement: When Kai gives a word card
The AI SHALL be told to give a word card when the learner asks how to say something, asks what a word means, or names a word to keep; to answer other language questions in short lines with no card; and to say now and then that the learner can ask how to say something.

#### Scenario: Prompt carries the rule
- **WHEN** the prompt is built for any turn
- **THEN** it holds the word-card rule and the shape of `word`

### Requirement: Add the word
`POST /v1/kai/chat/messages/{id}/add-word` SHALL add the message's word as a new card (stage 0) to the caller's Random Words deck and answer `200` with `{ deckId, deckTitle, count, already }`. `count` is the number of cards in that deck after the add.

#### Scenario: First word
- **WHEN** a user with no Random Words deck adds a word
- **THEN** a deck "Random Words 1" exists with that one card, and the answer has `count: 1` and `already: false`

#### Scenario: Twice
- **WHEN** the same message is added again
- **THEN** the answer is the same and the deck still has one copy of the word

#### Scenario: Already known
- **WHEN** the word "Para llevar" is added and the user already has "para llevar" in another deck
- **THEN** no card is added and the answer has `already: true`

#### Scenario: No word or not mine
- **WHEN** the message has no word, or belongs to another user
- **THEN** the answer is `409` for the first and `404` for the second
