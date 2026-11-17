## ADDED Requirements

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
