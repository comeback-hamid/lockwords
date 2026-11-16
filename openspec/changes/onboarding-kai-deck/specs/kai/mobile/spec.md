# Spec Delta

## Purpose
The chat parts every Kai chat screen is built from, so all chats look and behave the same.

## ADDED Requirements

### Requirement: Kai chat screen parts
A Kai chat screen SHALL have: a Kai header at the top (one big Kai, no page title, no small avatars), messages that scroll under it, Kai's messages as separate bubbles on the left with **bold** key words, the user's messages as green bubbles on the right, and a composer at the bottom.

#### Scenario: Bubbles
- **WHEN** a chat shows a Kai message "Nice to meet you, **Maya**!" and a user message "Maya"
- **THEN** Kai's bubble is on the left with "Maya" in bold, and the user's bubble is green on the right

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
The deck card SHALL show the level and word count ("A2+ · 10 WORDS") and the title in quotes, in one of three states: proposed (the reason line and a Generate button), generating ("Making your deck…", a progress bar and "n / 10 WORDS", no button), ready ("JUST NOW", ten level squares and "10 WORDS · ADDED TO YOUR DECKS"; tapping it opens the deck).

#### Scenario: States
- **WHEN** the card is shown as proposed, then generating, then ready
- **THEN** it shows the Generate button, then the progress bar with no button, then "ADDED TO YOUR DECKS"
