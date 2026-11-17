## ADDED Requirements

### Requirement: Kai types
Before each Kai bubble the chat SHALL show a Kai bubble with three moving dots for about one second (0.8 s for a short line, up to 1.2 s for a long one), then replace it with the whole message at once. Bubbles of one turn come one after another. Reply options show only after Kai's last bubble of the turn. The composer works the whole time.

#### Scenario: Typing
- **WHEN** Kai says "Hi! I’m Kai 👋"
- **THEN** a dots bubble shows first (labelled "Kai is typing"), and about one second later the message shows in its place

#### Scenario: Options wait
- **WHEN** Kai's turn ends with reply options
- **THEN** the options show after the last bubble, not before

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

## MODIFIED Requirements

### Requirement: Deck card
The deck card SHALL show the level and word count ("A2+ · 10 WORDS") and the title in quotes, in one of three states: proposed (the reason line and a Generate button), generating ("Making your deck…", a progress bar and "n / 10 WORDS", no button), ready ("JUST NOW", ten level squares and "10 WORDS · ADDED TO YOUR DECKS"; tapping it opens the deck). While generating, the count SHALL go up by one about every 1.6 seconds, stop at 9, and jump to 10 when the deck is ready. Kai's `making` state shows the same progress.

#### Scenario: States
- **WHEN** the card is shown as proposed, then generating, then ready
- **THEN** it shows the Generate button, then the progress bar with no button, then "ADDED TO YOUR DECKS"

#### Scenario: Timed count
- **WHEN** the deck has been generating for 5 seconds
- **THEN** the card shows "3 / 10 WORDS", and never more than "9 / 10 WORDS" until the deck is ready
