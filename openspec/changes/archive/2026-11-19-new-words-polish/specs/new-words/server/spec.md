## ADDED Requirements

### Requirement: Read older messages
`GET /v1/kai/chat` SHALL say if older messages are left: `hasMore: true` when the caller has messages older than the ones returned; the field is left out when there are none. With `?before=<message id>` the answer SHALL hold the 50 messages just before that message, oldest first, and no options. A `before` that is not a message of the caller is answered with `404` `not_found`.

#### Scenario: A long chat
- **WHEN** a user with 120 messages reads the chat
- **THEN** the newest 50 come back with `hasMore: true`

#### Scenario: The page before
- **WHEN** that user reads the chat with `before` set to the oldest message they got
- **THEN** the 50 messages before it come back, oldest first, with `hasMore: true` and no options

#### Scenario: The first page
- **WHEN** that user reads with `before` set to their 21st message
- **THEN** their first 20 messages come back and `hasMore` is left out

#### Scenario: Not mine
- **WHEN** a user reads with `before` set to another user's message, or to a text that is no message id
- **THEN** the answer is `404`

### Requirement: When Kai leads to Review
The prompt SHALL tell Kai to set `action: "review"` only when the learner clearly asks to practice or review now, or says yes to Kai's own offer to practice. A greeting, small talk or a question is never a reason, also when words are due: Kai answers normally and may offer practice as a question or an option, with no action.

#### Scenario: Prompt carries the rule
- **WHEN** the prompt for any turn is built
- **THEN** it says that the action is only for a clear ask to practice or a yes to Kai's offer, and that a greeting is never a reason

#### Scenario: A greeting
- **WHEN** a learner with 10 words due sends "Hola Kai" to the stand-in AI
- **THEN** the answer has no action

### Requirement: Kai's lines stay in the learning language
The prompt SHALL tell Kai to write every line fully in the learning language and never to drop English app words into it. For a set of flashcards Kai uses that language's own everyday word (Spanish "mazo" or "lista de palabras", never "deck"). Kai keeps only the names of things the learner taps as the app shows them: "Generate", "Review" and "Random Words".

#### Scenario: Prompt carries the rule
- **WHEN** the prompt is built for a learner of Spanish or of Persian
- **THEN** it has this rule with the learning language's name, and its example line about decks does not use the word "decks"
