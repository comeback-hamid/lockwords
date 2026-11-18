# kai/mobile Specification

## Purpose
The chat parts every Kai chat screen is built from, so all chats look and behave the same.

## Requirements

### Requirement: Kai chat screen parts
A Kai chat screen SHALL have: a Kai header at the top (one big, live, moving Kai, no page title, no small avatars), messages that scroll under it, Kai's messages as separate bubbles on the left with **bold** key words, the user's messages as green bubbles on the right, and a composer at the bottom.

#### Scenario: Bubbles
- **WHEN** a chat shows a Kai message "Nice to meet you, **Maya**!" and a user message "Maya"
- **THEN** Kai's bubble is on the left with "Maya" in bold, and the user's bubble is green on the right

#### Scenario: Live header
- **WHEN** a chat screen opens
- **THEN** the header shows the live Kai (not a picture), labelled "Kai" for screen readers

### Requirement: Reply options
When the choices are fixed, the chat SHALL show them as pills stacked on the right, just above the composer, with the hint "Tap an option, or type your own". Tapping a pill sends its text as the user's message. Typing and sending does the same with the typed text.

#### Scenario: Tap an option
- **WHEN** the user taps the pill "Ordering food"
- **THEN** a green bubble "Ordering food" appears and the pills go away

### Requirement: Composer
The composer SHALL show a text box with a placeholder and a round button: a mic when the box is empty, a green send arrow when it has text. Sending clears the box. Empty text cannot be sent.

#### Scenario: Send
- **WHEN** the user types "Maya" and taps send
- **THEN** the message is sent and the box is empty

### Requirement: Deck card
The deck card SHALL show the level and word count ("A2+ · 10 WORDS") and the title in quotes, in one of three states: proposed (the reason line and a Generate button), generating ("Making your deck…", a progress bar and "n / N WORDS", no button), ready ("JUST NOW", level squares and "N WORDS · ADDED TO YOUR DECKS"; tapping it opens the deck). N is the deck's word count (10 for the first deck; New words decks have 10 to 30).

#### Scenario: States
- **WHEN** the card is shown as proposed, then generating, then ready
- **THEN** it shows the Generate button, then the progress bar with no button, then "ADDED TO YOUR DECKS"

### Requirement: Deck card count
While a deck is generating, its card's count SHALL go up by one about every 1.6 seconds, stop at N − 1, and jump to N when the deck is ready. Kai's `making` state shows the same progress.

#### Scenario: Timed count
- **WHEN** the deck has been generating for 5 seconds
- **THEN** the card shows "3 / 10 WORDS", and never more than "9 / 10 WORDS" until the deck is ready

### Requirement: Kai moves
Kai SHALL be drawn live from the character spec (`src/kai/character-spec.json`) in its chat form, at 60 frames a second, and look and move like the same state on `docs/design/CHARACTER.html`. Every chat-form state in the spec SHALL be accepted. A state change SHALL be soft (every pose number moves part of the way to its target each frame, as the spec's `poseSmoothing` says). Kai SHALL blink on its own as the spec's `blink` rule says.

#### Scenario: Same as the design page
- **WHEN** Kai is shown in `greeting`, `idle`, `listening`, `thinking`, `speaking`, `making` (half done), `celebrate`, `waiting` and `oops`, next to the same state on `docs/design/CHARACTER.html`
- **THEN** each pair has the same shape, colors, motion and effect (checked by screenshots in the PR)

#### Scenario: Unknown state
- **WHEN** a screen asks for a state the spec does not have
- **THEN** Kai shows `idle`

### Requirement: One-shot states return
A state with `holdMs` in the spec SHALL play once, hold for `holdMs`, then go to its `returnsTo` state (`previous` = the state before it). A screen that sets a new state during the hold SHALL win.

#### Scenario: Greeting then idle
- **WHEN** a screen shows Kai in `greeting`
- **THEN** Kai waves for 2 seconds, then is in `idle`

#### Scenario: Celebrate then idle
- **WHEN** a screen shows Kai in `celebrate`
- **THEN** after 2.4 seconds Kai is in `idle`

### Requirement: Making shows progress
In `making`, the body SHALL fill from left to right with the progress the screen gives (0 to 1). With no progress given, it follows the spec's `fakeProgress` rule.

#### Scenario: Half done
- **WHEN** Kai is in `making` with progress 0.5
- **THEN** about half of the body's slabs are lit

### Requirement: Reduce Motion
With the phone's Reduce Motion setting on, Kai SHALL show each state's still pose with no loops, no one-shot moves and no effects. State changes still show.

#### Scenario: Reduce Motion
- **WHEN** Reduce Motion is on and Kai is in `greeting`
- **THEN** Kai shows the greeting pose without waving, and goes to `idle` after `holdMs` as usual

### Requirement: Kai types
In every chat with Kai (the onboarding chat and the Use it chat), each Kai bubble SHALL come after a Kai bubble with three moving gray dots, shown for about one second (0.8 s for a short line, up to 1.2 s for a long one). The dots are then replaced by the whole message at once. When Kai sends several bubbles in a row, each one gets its own dots, one after another. Reply options show only after Kai's last bubble of the turn. The composer works the whole time.

#### Scenario: Typing
- **WHEN** Kai says "Hi! I’m Kai 👋"
- **THEN** a dots bubble shows first (labelled "Kai is typing"), and about one second later the message shows in its place

#### Scenario: Several bubbles
- **WHEN** Kai sends 5 bubbles in a row
- **THEN** each bubble has its own dots first, and they show one after another, never at the same time

#### Scenario: Use it chat
- **WHEN** the learner sends a sentence in the Use it chat and Kai answers with 2 lines
- **THEN** each line comes after its own dots

#### Scenario: Options wait
- **WHEN** Kai's turn ends with reply options
- **THEN** the options show after the last bubble, not before

#### Scenario: Generate waits
- **WHEN** a proposed deck card is shown and Kai is still typing the line after it
- **THEN** the card's Generate button keeps its place but cannot be seen or tapped until that line is shown

### Requirement: A tapped option moves up
Tapping a reply option SHALL move that pill up into the chat, where it becomes the user's green bubble (about 0.3 s). The other pills fade out. With Reduce Motion on, the bubble just appears.

#### Scenario: Tap
- **WHEN** the user taps "Ordering food"
- **THEN** the pills are gone and a green bubble "Ordering food" is the last user message

### Requirement: Kai's state follows the chat
The Kai header SHALL show: `greeting` when the chat opens (then `idle`); `listening` while the composer has text; `thinking` while the app waits for the server; `speaking` while a dots bubble shows; `making` with the deck progress while the deck is made; `celebrate` when the deck is ready (then `idle`); `oops` when a server call fails (then `idle`); `waiting` when it is the user's turn and nothing happened for 20 seconds. Any typing or tap leaves `waiting`.

#### Scenario: Busy
- **WHEN** the user taps Generate
- **THEN** Kai is in `making` until the deck is ready, then in `celebrate`

#### Scenario: Quiet
- **WHEN** Kai asks for the name and the user does nothing for 20 seconds
- **THEN** Kai is in `waiting`, and in `listening` as soon as the user types
