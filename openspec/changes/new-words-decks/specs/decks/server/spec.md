## ADDED Requirements

### Requirement: Title translation
A deck SHALL have `titleTranslation`: the title in the user's native language, or null when the deck has none. Every answer that returns a deck includes it.

#### Scenario: A deck from the chat
- **WHEN** the owner reads a deck that Kai offered with the title "Pedir comida" and the translation "Ordering food"
- **THEN** the answer has `title: "Pedir comida"` and `titleTranslation: "Ordering food"`

#### Scenario: An older deck
- **WHEN** the owner reads a deck made in onboarding
- **THEN** `titleTranslation` is null
