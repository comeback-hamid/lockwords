## Purpose
How the server runs the New words chat: it keeps the chat history, lets Kai answer as an agent that knows and remembers the learner, and saves the translation setting.

## ADDED Requirements

### Requirement: Read the chat
`GET /v1/kai/chat` SHALL answer `200` with `{ messages, options, translationOn }`. `messages` are the caller's newest 50 messages, oldest first, each `{ id, from, text, translation, createdAt }` with `from` `kai` or `user`. `translation` is null on user messages. `options` are the reply options of the last message when Kai wrote it, else empty.

#### Scenario: Empty chat
- **WHEN** a user who never chatted reads the chat
- **THEN** the answer is `200` with no messages and no options

#### Scenario: After a restart
- **WHEN** a user who had 3 messages reads the chat again
- **THEN** the same 3 messages come back in the same order

#### Scenario: Private
- **WHEN** two users have chats
- **THEN** each one reads only their own messages

### Requirement: A turn
`POST /v1/kai/chat/turns` with `{ text }` (1–500 characters) SHALL save the user's message, ask Kai, save Kai's lines, and answer `200` with `{ userMessage, messages, options, action }`. `messages` are Kai's new lines. `action` is `review` or null. The caller's profile must exist.

#### Scenario: A message
- **WHEN** a user with a profile sends `{ "text": "Hola" }`
- **THEN** the answer is `200` with 1 to 3 Kai messages, and reading the chat shows the user's message followed by them

#### Scenario: No profile
- **WHEN** a user with no profile sends a message
- **THEN** the answer is `409` with `{ "error": "no_profile" }`

#### Scenario: Bad text
- **WHEN** `text` is empty or longer than 500 characters
- **THEN** the answer is `400`

### Requirement: Kai opens the chat
`POST /v1/kai/chat/turns` with `{ open: true }` SHALL make Kai's opening lines when Kai has not opened in the last 12 hours, and answer `200` like a turn (no `userMessage`). Otherwise it answers `200` with no messages and saves nothing.

#### Scenario: First visit
- **WHEN** a user with an empty chat sends `{ "open": true }`
- **THEN** Kai's lines are saved and returned, and the AI was told this is the first visit

#### Scenario: Same day again
- **WHEN** the same user sends `{ "open": true }` one hour later
- **THEN** the answer has no messages and the chat has no new message

#### Scenario: Next day
- **WHEN** the same user sends `{ "open": true }` 13 hours after the last opening
- **THEN** Kai's new lines are saved and returned, and the AI was told this is not the first visit

### Requirement: Kai's lines
Kai SHALL answer with 1 to 3 lines, each at most 160 characters, written in the learning language, each with a translation in the native language. Kai SHALL give 0 to 3 options, each at most 30 characters. An answer outside these limits is treated as a failed AI call.

#### Scenario: Shape
- **WHEN** Kai answers any turn
- **THEN** there are 1 to 3 lines, every line has text and a translation, and there are at most 3 options

#### Scenario: Too long
- **WHEN** the AI returns 5 lines, or a line of 300 characters
- **THEN** the answer is not saved and the turn fails as "Kai fails safely" says

### Requirement: What Kai is told
For every turn the AI SHALL get: the profile (name, learning and native language, CEFR level, known-words estimate, goal, interests), Kai's saved notes, the last 20 messages, whether this is an opening and whether it is the first visit, and word facts: how many words the user has, how many they reviewed in the last 24 hours, how many are due now, and up to 10 of their words (hard words first).

#### Scenario: Context
- **WHEN** a user at level A2 with 2 notes, 30 words and 5 due cards sends a message
- **THEN** the AI input has level A2, both notes, total 30, due 5, and at most 10 of the user's words

#### Scenario: Short history
- **WHEN** the chat has 60 messages
- **THEN** the AI input has only the newest 20

### Requirement: Rules Kai follows
The prompt SHALL tell Kai to: write at the learner's CEFR level; use emoji and `**bold**` key words; answer in the learning language even when the user writes in the native language; switch to the native language only when the user asks; help only with language learning; never ask for the learner's goal; not offer decks on every opening; and, on the first visit of an A1 or A2 learner, say they may write in their own language.

#### Scenario: Prompt carries the rules
- **WHEN** the prompt is built for an A1 learner's first visit
- **THEN** it holds the level, the two languages, the first-visit rule and the "may write in your own language" rule

#### Scenario: Not first visit
- **WHEN** the prompt is built for a later opening of a C1 learner
- **THEN** it has no first-visit rule and no "own language" rule

### Requirement: Kai remembers
When the AI returns `remember` notes, the server SHALL save each one (at most 200 characters) for the user, skip a note that is already saved, and keep the newest 50. Notes are used in later turns.

#### Scenario: A new fact
- **WHEN** the AI returns `remember: ["Starts a job in a café in March"]`
- **THEN** the note is saved, and the next turn's AI input has it

#### Scenario: Same fact twice
- **WHEN** the AI returns a note that is already saved
- **THEN** there is still one copy

#### Scenario: Limit
- **WHEN** a user has 50 notes and a new one is saved
- **THEN** the user has 50 notes and the oldest is gone

### Requirement: Lead to Review
When the AI answers with `action: "review"`, the turn's answer SHALL have `action: "review"`. Any other value is dropped.

#### Scenario: Practice
- **WHEN** the user sends "Vamos a practicar" and the AI answers with `action: "review"`
- **THEN** the answer has `action: "review"` and Kai's lines

### Requirement: Kai fails safely
The AI call SHALL time out after 20 seconds and be tried once more when the answer has the wrong shape. If it still fails, the answer is `502` with `{ "error": "kai_unavailable" }` and nothing from this turn is saved. Message text SHALL never be written to logs.

#### Scenario: AI down
- **WHEN** the AI throws on a turn
- **THEN** the answer is `502`, and reading the chat does not show the user's message

#### Scenario: Second try works
- **WHEN** the first AI answer has the wrong shape and the second is good
- **THEN** the answer is `200`

### Requirement: Daily limit
A user SHALL get at most 200 turns in 24 hours. After that a turn answers `429` with `{ "error": "too_many_messages" }`. An opening does not count.

#### Scenario: Over the limit
- **WHEN** a user who sent 200 messages in the last 24 hours sends one more
- **THEN** the answer is `429` and nothing is saved

### Requirement: Translation setting
`PUT /v1/kai/chat/translation` with `{ on }` SHALL save the caller's choice. `translationOn` in the chat answer is the saved choice, or, when nothing is saved, `true` for CEFR A1 and A2 and `false` for B1 and above.

#### Scenario: Default by level
- **WHEN** an A2 user and a B1 user who never changed the setting read the chat
- **THEN** the A2 user gets `translationOn: true` and the B1 user gets `false`

#### Scenario: Saved choice
- **WHEN** the A2 user sends `{ "on": false }` and reads the chat again
- **THEN** `translationOn` is `false`
