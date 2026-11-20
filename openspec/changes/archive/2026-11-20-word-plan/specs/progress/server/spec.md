## ADDED Requirements

### Requirement: Word plan
`GET /v1/plan` SHALL answer `200` with `{ goal, items }`. `goal` is the learner's goal in words. `items` are up to three next deck ideas with `topic`, `words` (10 to 30) and `kind` (`words`, `phrases` or `words + phrases`), never a topic the learner already has a deck for. The AI task makes the plan and it is kept; a new one is made when fewer than three ideas are left or it is older than 7 days. With no profile, or when the AI fails and nothing is kept, `items` is empty.

#### Scenario: First call
- **WHEN** a learner with a profile and no kept plan calls it
- **THEN** the AI makes three ideas, they are kept, and they come back

#### Scenario: Second call
- **WHEN** the learner calls it again the same day
- **THEN** the same three ideas come back and no AI call is made

#### Scenario: A deck was made
- **WHEN** the learner now has a deck for one of the three topics
- **THEN** that topic is not in the list, and a new plan of three is made

#### Scenario: AI fails
- **WHEN** the AI call fails and two kept ideas are left
- **THEN** the answer is `200` with those two

#### Scenario: No profile
- **WHEN** a user with no profile calls it
- **THEN** `items` is empty
