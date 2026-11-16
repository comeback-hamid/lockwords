# use-it/mobile Specification

## Purpose
The Use it chat: the user writes a sentence with a word and Kai checks it.

## Requirements

### Requirement: Use it chat
Opening Use it for a card SHALL show a Kai chat with a close button: "Time to use a word! ✍️", a word row (level square, word, translation), "Write one sentence with **<word>**. I’ll check it for you.", and the reply options "Show me an example" and "Skip this word". "Show me an example" makes Kai show the card's example. "Skip this word" closes the chat.

#### Scenario: Open
- **WHEN** the user taps Use it on "la propina"
- **THEN** the three Kai messages and the two options show

### Requirement: Checking a sentence
Sending a sentence SHALL show it as the user's bubble, then "Checking… 👀", then the server's lines as Kai bubbles. For a good sentence thumbs-up emoji float up, the label "<WORD> MOVED UP A LEVEL" shows when the word moved up, and the option "Next card" closes the chat. For a weak sentence the user can write again. If the check fails Kai says "I could not check that. Try again."

#### Scenario: Good sentence
- **WHEN** the server answers good with two lines and moved up
- **THEN** both lines show, "LA PROPINA MOVED UP A LEVEL" shows, and "Next card" is offered

#### Scenario: Weak sentence
- **WHEN** the server answers not good
- **THEN** its lines show and there is no "moved up" label

#### Scenario: Check fails
- **WHEN** the server cannot be reached
- **THEN** Kai says "I could not check that. Try again."
