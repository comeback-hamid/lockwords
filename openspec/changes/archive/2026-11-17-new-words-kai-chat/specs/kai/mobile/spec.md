## ADDED Requirements

### Requirement: Translation line
A Kai bubble SHALL be able to show a translation: under the message, after a thin divider line, in a smaller gray font. It shows only when the screen says translations are on and the message has one. User bubbles never show one.

#### Scenario: On
- **WHEN** a Kai message "¡Hola Maya!" with the translation "Hi Maya!" is shown with translations on
- **THEN** the bubble shows the message, a divider, and "Hi Maya!" in smaller text

#### Scenario: Off
- **WHEN** the same message is shown with translations off
- **THEN** the bubble shows only "¡Hola Maya!"

### Requirement: Composer without a mic
A screen SHALL be able to turn the composer's mic off. Then the round button shows only when the box has text (the green send arrow).

#### Scenario: No mic
- **WHEN** a screen turns the mic off and the box is empty
- **THEN** the composer shows no round button
