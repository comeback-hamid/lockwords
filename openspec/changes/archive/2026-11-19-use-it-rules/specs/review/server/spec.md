## ADDED Requirements

### Requirement: Use it is offered by the server
Each card in `GET /v1/review` SHALL have `canUseIt`: true when the card's stage is 3 or higher, and true for every card on the learner's first review day (no history before today). Otherwise false.

#### Scenario: Normal day
- **WHEN** a learner who reviewed yesterday reads a round with a stage 1 card and a stage 3 card
- **THEN** `canUseIt` is false for the first and true for the second

#### Scenario: First day
- **WHEN** a learner with no history reads their first round of new cards
- **THEN** `canUseIt` is true for every card
