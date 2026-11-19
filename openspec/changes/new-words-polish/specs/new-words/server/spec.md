## MODIFIED Requirements

### Requirement: Read the chat
`GET /v1/kai/chat` SHALL answer `200` with `{ messages, options, translationOn, nativeLanguage }` (`nativeLanguage` is the profile's, or null with no profile; the translation button shows its code). `messages` are the caller's newest 50 messages, oldest first, each `{ id, from, text, translation, createdAt }` with `from` `kai` or `user`. `translation` is null on user messages. `options` are the reply options of the last message when Kai wrote it, else empty.

With `?before=<message id>` the answer SHALL hold the 50 messages just before that message, oldest first, and no options. The answer has `hasMore: true` when the caller has messages older than the ones returned; the field is left out when there are none. A `before` that is not a message of the caller is answered with `404` `not_found`.

#### Scenario: Empty chat
- **WHEN** a user who never chatted reads the chat
- **THEN** the answer is `200` with no messages and no options

#### Scenario: After a restart
- **WHEN** a user who had 3 messages reads the chat again
- **THEN** the same 3 messages come back in the same order

#### Scenario: Private
- **WHEN** two users have chats
- **THEN** each one reads only their own messages

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

## ADDED Requirements

### Requirement: When Kai leads to Review
The prompt SHALL tell Kai to set `action: "review"` only when the learner clearly asks to practice or review now, or says yes to Kai's own offer to practice. A greeting, small talk or a question is never a reason, also when words are due: Kai answers normally and may offer practice as a question or an option, with no action.

#### Scenario: Prompt carries the rule
- **WHEN** the prompt for any turn is built
- **THEN** it says that the action is only for a clear ask to practice or a yes to Kai's offer, and that a greeting is never a reason

#### Scenario: A greeting
- **WHEN** a learner with 10 words due sends "Hola Kai" to the stand-in AI
- **THEN** the answer has no action
