# decks/mobile Specification

## Purpose
The deck page: a deck's words, and removing a word or the whole deck.

## Requirements

### Requirement: Remove a word on the deck page
The deck page SHALL show the hint "Swipe left on a word to remove it" above the words. Dragging a word row left shows a red **Delete** button. A tap on Delete removes the word from the list at once, lowers the word count in the heading, and tells the server. Only one row is open at a time. Each row also has the accessibility action "Delete".

#### Scenario: Delete a word
- **WHEN** the learner swipes "la cuenta" left and taps Delete
- **THEN** "la cuenta" is gone from the list and the heading says one word fewer

#### Scenario: The server fails
- **WHEN** the server call fails
- **THEN** the word is back in the list and the page says "Could not remove the word."

#### Scenario: Last word
- **WHEN** the learner removes the last word of a deck
- **THEN** the page says "No words in this deck."

### Requirement: Remove the deck
The deck page SHALL show **Remove deck** in the top bar once the deck is loaded. A tap opens a pop-up "Remove this deck?" with **Cancel** and **Remove**. After Remove the app tells the server, then goes back to where the learner came from (the tabs when there is nothing to go back to). If the call fails the learner stays on the page and sees "Could not remove the deck."

#### Scenario: Remove
- **WHEN** the learner taps Remove deck and then Remove
- **THEN** the deck is removed on the server and the app leaves the deck page

#### Scenario: Cancel
- **WHEN** the learner taps Remove deck and then Cancel
- **THEN** nothing is removed and the page stays

#### Scenario: The server fails
- **WHEN** the server call fails
- **THEN** the page stays and says "Could not remove the deck."
