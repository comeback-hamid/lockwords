## MODIFIED Requirements

### Requirement: Checking a sentence
Sending a sentence SHALL show it as the user's bubble, then "Checking… 👀", then the server's lines as Kai bubbles. A good sentence: thumbs-up emoji float up, "<WORD> MOVED UP A LEVEL" shows when the word moved up, and the options are "Next card" and the server's follow-up question, if any. A weak sentence: "Show me an example" and "Skip this word" stay. A failed check: Kai says "I could not check that. Try again."

#### Scenario: Good sentence
- **WHEN** the server answers good with two lines, moved up, and the follow-up "Why “le”?"
- **THEN** both lines show, "LA PROPINA MOVED UP A LEVEL" shows, and "Next card" and "Why “le”?" are offered

#### Scenario: Weak sentence
- **WHEN** the server answers not good
- **THEN** its lines show, there is no "moved up" label, and "Show me an example" and "Skip this word" are offered

#### Scenario: Check fails
- **WHEN** the server cannot be reached
- **THEN** Kai says "I could not check that. Try again."

## ADDED Requirements

### Requirement: Follow-up questions
After a good sentence the text box SHALL read "Ask Kai about this word…". A tapped follow-up question or typed text is sent as a question: it shows as the user's bubble and Kai's answer lines follow. The word's level never changes. "Next card" stays offered. If the question cannot be answered Kai says "I could not answer that. Try again."

#### Scenario: Tapped question
- **WHEN** the user taps "Why “le”?" and the server answers with one line
- **THEN** the question and Kai's line show, and "Next card" is still offered

#### Scenario: Typed question
- **WHEN** the user types a question after a good sentence
- **THEN** it is sent as a question, not checked as a sentence

#### Scenario: Ask fails
- **WHEN** the server cannot be reached
- **THEN** Kai says "I could not answer that. Try again."
