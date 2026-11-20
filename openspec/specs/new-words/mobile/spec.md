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

### Requirement: Deck ideas in the chat
A Kai message with decks SHALL show them under the bubble as deck cards. Three cards show in a row the user swipes sideways, with page dots. One card shows alone. Cards that are not current show as disabled. Cards follow the translation button.

#### Scenario: Three ideas
- **WHEN** Kai's message has 3 current proposed decks
- **THEN** the first card shows with a Generate button, the next one peeks in from the right, and 3 dots show

#### Scenario: Swipe
- **WHEN** the user swipes the row left
- **THEN** the second card is in the middle and the second dot is dark

### Requirement: Making a deck
Tapping Generate SHALL hide the other cards of that row, show the chosen card as generating, put Kai in `making`, and ask the server to make the deck. While it runs, Generate cannot be tapped on any card. When the deck is ready, the card shows as ready and the app sends the ready event so Kai speaks. If making fails, the cards come back as proposed and a Kai bubble says it did not work and to try again.

#### Scenario: Generate
- **WHEN** the user taps Generate on the second card
- **THEN** only that card shows, in the generating state

#### Scenario: Ready
- **WHEN** the deck becomes ready
- **THEN** the card shows "IN YOUR WORD LIST", Kai's ready lines show, and the options from Kai show

#### Scenario: Fails
- **WHEN** the server answers 502 to generate
- **THEN** the three cards show again with Generate, and Kai says to try again

#### Scenario: Came back later
- **WHEN** the user left during making and opens New words after the deck is ready
- **THEN** the card shows as ready and Kai's ready lines show once

### Requirement: Open the deck
Tapping a ready deck card SHALL open the deck page with its words.

#### Scenario: Tap
- **WHEN** the user taps the ready card
- **THEN** the deck page shows with the deck's title and all its words

### Requirement: Review dot
When a deck becomes ready, the Review tab icon SHALL show a red dot. The dot goes away when the user opens the Review tab. It is kept after a restart.

#### Scenario: Dot
- **WHEN** a deck becomes ready
- **THEN** the Review tab shows a red dot, also after the app restarts

#### Scenario: Seen
- **WHEN** the user opens the Review tab
- **THEN** the dot is gone

### Requirement: Kai's state on New words
The Kai header on New words SHALL follow the chat by the shared rules of `kaiStateFor()`, in this order: `oops` for a moment when a turn or making a deck fails; `making` with the deck's progress; `thinking` while the app waits for the server; `speaking` while a typing bubble shows; `listening` while the composer has text; `celebrate` when a deck is ready or a word was added; `greeting` when Kai opens the chat; else `idle`.

#### Scenario: A turn
- **WHEN** the learner types "Hola", sends it, and Kai answers with one line
- **THEN** Kai is `listening`, then `thinking`, then `speaking`, then `idle`

#### Scenario: A turn fails
- **WHEN** the server answers 502 to a turn
- **THEN** Kai is `oops` for a moment

#### Scenario: A word is added
- **WHEN** the learner taps "Add to Random Words 1" and the word is added
- **THEN** Kai is `celebrate`

#### Scenario: Kai opens
- **WHEN** Kai opens the chat with new lines
- **THEN** Kai is `speaking` while they are typed, then `greeting`

### Requirement: Kai rests when the chat is quiet
When it is the learner's turn on New words and nothing happened for 20 seconds, Kai SHALL be `waiting`. After 2 minutes Kai SHALL be `sleeping`. Any typing, tap or scroll ends both, and the clock starts again. Both come before `celebrate` and `greeting` in the order of states, and after `listening`.

#### Scenario: Quiet
- **WHEN** it is the learner's turn and nothing happens for 20 seconds, then for 2 minutes
- **THEN** Kai is `waiting`, then `sleeping`, and `listening` as soon as the learner types

### Requirement: A tapped option moves up on New words
Tapping a reply option on New words SHALL move it up into the chat as the learner's green bubble, as in the onboarding chat. With Reduce Motion on, the bubble just appears. A typed message does not move.

#### Scenario: Tap
- **WHEN** the learner taps "Ahora no"
- **THEN** the options are gone and the green bubble "Ahora no" rises into the chat

### Requirement: Right-to-left text
Every text of the chat SHALL be aligned by its own script: a text written mostly in a right-to-left script (Arabic, Persian, Urdu, Hebrew) is right-aligned and reads right to left; any other text is left-aligned. This holds for Kai's line and its translation (each by itself), the learner's bubble, the composer, the word card and the deck card. Kai's bubbles stay on the left and the learner's on the right.

#### Scenario: Learning Persian
- **WHEN** Kai says "سلام! امروز چه خبر؟" with the translation "Hi! What's new today?"
- **THEN** the Persian line is right-aligned and the English translation under it is left-aligned

#### Scenario: Persian speaker learning English
- **WHEN** Kai says "Hi! What's new today?" with the translation "سلام! امروز چه خبر؟"
- **THEN** the English line is left-aligned and the Persian translation is right-aligned

#### Scenario: Composer
- **WHEN** the learner types "سلام" in the composer
- **THEN** the text is right-aligned, and left-aligned again when the box is empty

#### Scenario: One English word in a Persian line
- **WHEN** a line is "این کلمه یعنی tip"
- **THEN** it is right-aligned

### Requirement: Older messages
When the server says older messages are left, the screen SHALL load the 50 messages before the oldest one shown when the learner scrolls to the top of the chat. They are added above, and the message the learner was reading stays where it was. While they load, a small line "Loading older messages…" shows at the top. A failed load shows nothing and is tried again on the next scroll to the top. With no older messages left, nothing is loaded.

#### Scenario: Scroll to the top
- **WHEN** the chat has older messages and the learner scrolls to the top
- **THEN** the 50 messages before show above the others and the chat does not jump

#### Scenario: The start of the chat
- **WHEN** the server says no older messages are left
- **THEN** scrolling to the top loads nothing

#### Scenario: New line while reading
- **WHEN** older messages were added above
- **THEN** the chat does not scroll to the bottom because of them
