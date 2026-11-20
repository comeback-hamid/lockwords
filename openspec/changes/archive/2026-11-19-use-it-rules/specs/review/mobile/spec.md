## ADDED Requirements

### Requirement: Use it only when offered
The card back SHALL show the "Use it" button only when the server marks the card with `canUseIt`.

#### Scenario: Offered
- **WHEN** a card with `canUseIt` true is flipped
- **THEN** the "Use it" button shows

#### Scenario: Not offered
- **WHEN** a card with `canUseIt` false is flipped
- **THEN** there is no "Use it" button
