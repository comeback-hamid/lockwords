# new-words/mobile Specification

## Purpose
The New words tab: one ongoing chat with Kai, where the learner talks about their words and Kai leads them to new words and to practice.

## Requirements

### Requirement: The tab is a chat with Kai
The New words tab SHALL show a Kai chat screen: the Kai header, the messages, reply options when Kai gave some, and the composer. It has no page title. On open it loads the chat, shows the newest message at the bottom, then asks the server for Kai's opening.

#### Scenario: First visit
- **WHEN** a user opens New words for the first time
- **THEN** Kai's opening lines show one after another, each after a typing bubble

#### Scenario: Coming back
- **WHEN** the user leaves the app and opens New words again one hour later
- **THEN** the old messages are there and Kai adds nothing new

### Requirement: Screen states
The screen SHALL show: **loading** (Kai in the header and no messages yet) while the chat loads; **error** ("Kai can't load the chat" and a Try again button) when loading fails; **Kai is busy** (typing bubble, Kai thinking) while a turn runs; **send failed** (a line "Kai can't answer right now" and a Try again button, with the user's text back in the composer) when a turn fails. There is no locked state.

#### Scenario: Loading fails
- **WHEN** the chat cannot be loaded
- **THEN** the error line and Try again show, and tapping Try again loads again

#### Scenario: A turn fails
- **WHEN** the user sends "Hola" and the server answers 502
- **THEN** the user's bubble is removed, "Hola" is back in the composer, and the send-failed line shows

#### Scenario: Too many messages
- **WHEN** the server answers 429
- **THEN** a Kai bubble says they talked a lot today and to come back tomorrow, and the composer stays usable

### Requirement: Sending
Sending typed text or tapping an option SHALL show the user's green bubble at once, hide the options, and ask the server for a turn. Kai's lines then show one by one, and the new options show after the last line. With no options there is no hint line.

#### Scenario: Typed
- **WHEN** the user types "¿Qué significa propina?" and taps send
- **THEN** the green bubble shows, then Kai's answer lines

#### Scenario: No options
- **WHEN** Kai's turn has no options
- **THEN** no option pills and no "Tap an option, or type your own" line show

### Requirement: Translation button
The Kai header SHALL have a button at the top right with the native language code (like "EN") and a switch. It starts as the server says. Tapping it shows or hides the translation line under every Kai message at once, and saves the choice on the server. The choice is kept after a restart.

#### Scenario: Switch off
- **WHEN** translations show and the user taps the button
- **THEN** no Kai message shows a translation, and the switch is off

#### Scenario: Kept
- **WHEN** the user switched it off and opens the app again
- **THEN** the switch is off and no translation shows

#### Scenario: Screen readers
- **WHEN** a screen reader reads the button
- **THEN** it says "Translation, on" or "Translation, off"

### Requirement: Move to Review
When a turn comes back with the action `review`, the app SHALL show Kai's lines, wait one second after the last one, then open the Review tab.

#### Scenario: Let's practice
- **WHEN** the user taps the option "Vamos a practicar" and the turn has the action `review`
- **THEN** Kai's line shows, and one second later the Review tab is open

### Requirement: Text only
The composer on this screen SHALL not show the mic. It shows the send button when there is text.

#### Scenario: Empty box
- **WHEN** the composer is empty
- **THEN** there is no mic button

### Requirement: Word card
A Kai message with a word SHALL show a word card under the bubble: the word in large bold text, a round speaker button, the meaning, a divider, the example with the word in green bold, the example's translation in smaller gray text, and one button. The meaning and the example's translation always show, also when the translation button is off. The speaker says the word in the learning language.

#### Scenario: Card
- **WHEN** Kai's message has the word "para llevar" with the meaning "to go (takeaway)"
- **THEN** the card shows the word, the speaker, the meaning, the example and its translation, and the button "Add to Random Words 1"

#### Scenario: Speaker
- **WHEN** the user taps the speaker
- **THEN** the phone says "para llevar" with the learning language's voice

### Requirement: Add to Random Words
The card's button SHALL say "Add to" and the name of the deck the server gave. Tapping it adds the word. While it runs the button is busy. Then it says "Added" with a check and cannot be tapped, and the Review tab shows the red dot. If the word was already in the user's words, it says "Already in your words". If adding fails, the button comes back and a small line says "Couldn't add it. Try again." The state is kept after a restart.

#### Scenario: Add
- **WHEN** the user taps "Add to Random Words 1"
- **THEN** the button says "Added", cannot be tapped, and the Review tab has the red dot

#### Scenario: Already there
- **WHEN** the server answers `already: true`
- **THEN** the button says "Already in your words"

#### Scenario: Fails
- **WHEN** the server answers an error
- **THEN** the button says "Add to Random Words 1" again and the try-again line shows

#### Scenario: After a restart
- **WHEN** the user added the word and opens the app again
- **THEN** that card's button says "Added"
