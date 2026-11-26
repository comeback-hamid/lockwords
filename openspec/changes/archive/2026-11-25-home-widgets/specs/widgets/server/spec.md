## ADDED Requirements

### Requirement: Plan fields for the home widgets
Every slot of `GET /v1/widget/plan` SHALL also have `example` (the card's example sentence, as it is on the card) and `imageUrl` (the full address of the card's picture; left out when the card has none).

#### Scenario: Card with a picture
- **WHEN** the slot's card has a picture
- **THEN** the slot has `imageUrl` and `example`

#### Scenario: Card without a picture
- **WHEN** the slot's card has no picture
- **THEN** the slot has no `imageUrl`
