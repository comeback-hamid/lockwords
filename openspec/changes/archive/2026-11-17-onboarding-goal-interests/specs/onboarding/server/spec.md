# Spec Delta: onboarding/server

## MODIFIED Requirements

### Requirement: Profile fields are checked
The body of `PUT /v1/profile` SHALL have: `learningLanguage` and `nativeLanguage` (1–40 characters), `level` (`brand_new`, `beginner`, `some_basics`, `intermediate`, `advanced`), `knownWords` (0–5000 or null), `cefr` (text or null), `goal` (`travel`, `work`, `move_abroad`, `family_friends`, `brain`, `school`, `other`), `goalOther` (up to 80 characters or null), `interests` (1–5 different items from the fixed list of 20). Anything else is refused.

#### Scenario: Bad body
- **WHEN** `level` is not one of the five values, or `interests` is empty, or an interest is not in the list
- **THEN** the answer is `400` and nothing is saved

#### Scenario: No token
- **WHEN** the request has no login token
- **THEN** the answer is `401`

#### Scenario: More than five interests
- **WHEN** the body has 6 different listed interests
- **THEN** the answer is `400` and nothing is saved

#### Scenario: A dropped interest
- **WHEN** the body has `cooking`, `fitness`, `fashion` or `gaming`
- **THEN** the answer is `400` and nothing is saved

## ADDED Requirements

### Requirement: The interest list
The list of interests SHALL be these 20: `food`, `travel`, `work`, `business`, `tech`, `science`, `music`, `movies`, `books`, `sports`, `health`, `nature`, `animals`, `art`, `news`, `family`, `friends_dating`, `shopping`, `money`, `culture`. The OpenAPI document lists exactly these.

#### Scenario: Every listed interest is taken
- **WHEN** a body has any one of the 20
- **THEN** the answer is `200`

### Requirement: Old saved interests still read
When the server reads a saved profile, it SHALL map old interests: `cooking` → `food`, `fitness` → `health`, and leave out `fashion` and `gaming` and any other name not on the list. A repeat is kept once, in first-seen order. More than 5 are kept as they are (old rows were allowed up to 24). The row in the database is not changed by a read.

#### Scenario: Old names map
- **WHEN** a saved row holds `['cooking', 'fashion', 'music']`
- **THEN** the profile reads as `['food', 'music']`

#### Scenario: A mapped name repeats
- **WHEN** a saved row holds `['food', 'cooking', 'fitness', 'health']`
- **THEN** the profile reads as `['food', 'health']`

#### Scenario: Only dropped names
- **WHEN** a saved row holds `['fashion', 'gaming']`
- **THEN** the profile reads with no interests
