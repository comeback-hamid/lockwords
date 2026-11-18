## ADDED Requirements

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
The deck card SHALL show the level and word count ("A2+ · 10 WORDS") and the title in quotes, in one of three states: proposed (the reason line and a Generate button), generating ("Making your deck…", a progress bar and "n / N WORDS", no button), ready ("JUST NOW", level squares and "N WORDS · ADDED TO YOUR DECKS"; tapping it opens the deck). N is the deck's word count (10 for the first deck; New words decks have 10 to 30). While generating, the count SHALL go up by one about every 1.6 seconds, stop at N − 1, and jump to N when the deck is ready. Kai's `making` state shows the same progress.

#### Scenario: States
- **WHEN** the card is shown as proposed, then generating, then ready
- **THEN** it shows the Generate button, then the progress bar with no button, then "ADDED TO YOUR DECKS"

#### Scenario: Timed count
- **WHEN** the deck has been generating for 5 seconds
- **THEN** the card shows "3 / 10 WORDS", and never more than "9 / 10 WORDS" until the deck is ready
