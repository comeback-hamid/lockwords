# Spec Delta

## MODIFIED Requirements

### Requirement: Finishing saves the profile
Tapping Continue on O9 SHALL send the answers to the server. On success the app shows the Kai chat (O10). On failure it stays on O9 and shows "Could not save. Try again." with the button still usable. Onboarding is remembered as finished only at the end of the Kai chat.

#### Scenario: Saved
- **WHEN** the server answers `200`
- **THEN** the Kai chat shows, and onboarding is not yet marked finished

#### Scenario: Save fails
- **WHEN** the server cannot be reached
- **THEN** O9 stays, the message shows, and tapping Continue tries again

## ADDED Requirements

### Requirement: O10 Kai asks the name
The chat SHALL open with Kai saying "Hi! I’m Kai 👋" and "I’ll help you learn **<language>** words. What’s your name?". The user types a name (1–40 characters) and sends it.

#### Scenario: Name
- **WHEN** the user sends "Maya"
- **THEN** Kai says "Nice to meet you, **Maya**! 😊" and "Which language should we chat in?"

### Requirement: O10b Chat language
Kai SHALL offer two reply options: the user's own language and the language they learn. The answer and the name are saved on the server.

#### Scenario: Pick
- **WHEN** the user taps "English"
- **THEN** the name and the chat language are sent to the server, and Kai goes on to explain what he does

#### Scenario: Save fails
- **WHEN** the server cannot be reached
- **THEN** the chat goes on anyway (the app sends them again with the deck request)

### Requirement: O10c What Kai does, pick your words
Kai SHALL explain in short bubbles (decks made for you, review with quick swipes, use them in sentences, hard words go to the lock screen), then say "Let’s start with **10 new words**. What do you want to learn? 🌮" and show the server's four deck ideas as reply options. The composer placeholder is "Or tell me what you need…". If the ideas cannot be loaded, no options show and the user can still type a topic.

#### Scenario: Ideas
- **WHEN** the server answers four ideas
- **THEN** four reply options show with those texts

### Requirement: O10d Deck card and Generate
After a topic is chosen, Kai SHALL say "Good choice! Here’s your first deck 👇", show the proposed deck card, and say "Tap Generate and I will make it for you ✨". If proposing fails, Kai says "I could not reach the server. Tap to try again." with a "Try again" option.

#### Scenario: Proposed
- **WHEN** the user taps "Ordering food" and the server proposes a deck
- **THEN** the deck card shows with its title and a Generate button

### Requirement: O10e Making the deck
Tapping Generate SHALL switch the card to the generating state and Kai SHALL say "Picking the best words for your level… ⏳". If making fails, the card returns to proposed and Kai says "That did not work. Tap Generate to try again."

#### Scenario: Generating
- **WHEN** the user taps Generate
- **THEN** the card shows "Making your deck…" and the Generate button is gone

### Requirement: O10f Deck ready
When the deck is ready the card SHALL switch to ready, and Kai SHALL say "Your deck is **ready**! 🎉 Tap it any time to see the words." and "Shall we practice them now? 💪" with the options "OK, let’s practice!" and "Show me the words first". Either answer marks onboarding finished. "OK, let’s practice!" opens the tabs on Review. "Show me the words first" opens the deck page.

#### Scenario: Practice
- **WHEN** the user taps "OK, let’s practice!"
- **THEN** onboarding is marked finished and the Review tab shows

#### Scenario: Words first
- **WHEN** the user taps "Show me the words first"
- **THEN** onboarding is marked finished and the deck page lists the 10 words with their translations

### Requirement: Deck page
The deck page SHALL show the deck title and its words with translations. States: loading (quiet loading line), error (message + "Try again"). Closing it goes to the tabs.

#### Scenario: List
- **WHEN** the deck has 10 cards
- **THEN** 10 rows show, each with the word and its translation
