## ADDED Requirements

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
