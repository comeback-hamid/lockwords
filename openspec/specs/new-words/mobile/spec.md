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
