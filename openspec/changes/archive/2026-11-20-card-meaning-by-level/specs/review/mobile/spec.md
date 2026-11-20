## ADDED Requirements

### Requirement: Meaning on the card back
The card back SHALL show the card's `meaning` in the place of the translation when the card has one. A card with no meaning shows the translation.

#### Scenario: Card with a meaning
- **WHEN** a card with the meaning "El sabor que alguien le da a la comida." is flipped
- **THEN** that meaning shows and the translation does not

#### Scenario: Card without a meaning
- **WHEN** a card with no meaning is flipped
- **THEN** the translation shows
