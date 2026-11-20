## ADDED Requirements

### Requirement: Language and trees
`GET /v1/progress` SHALL also answer `language`, the English name of the language being learned ("Spanish"; empty with no profile), and `trees`: one list per ready deck, oldest deck first, with the stage of each of its words that is met (stage 1 or higher, a known word counts as 5), highest first.

#### Scenario: Two decks
- **WHEN** the older deck has words at stage 2 and 5 and eight new words, and the newer deck has only new words
- **THEN** `trees` is `[[5, 2], []]`

#### Scenario: Language
- **WHEN** the profile says the learner learns `es`
- **THEN** `language` is "Spanish"
