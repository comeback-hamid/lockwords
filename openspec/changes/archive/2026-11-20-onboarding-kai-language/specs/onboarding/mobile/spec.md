## ADDED Requirements

### Requirement: Kai speaks the chosen language
The onboarding chat SHALL show Kai's fixed lines and tap answers in the learner's own language until a chat language is picked on O10b. After "own language" they stay so. After "the language I learn" they are in the learned language, with the learner's-language line as a translation line under each Kai bubble. English is used when the script does not load within 4 seconds, and for an English speaker chatting in English.

#### Scenario: Persian speaker
- **WHEN** a Persian speaker who learns Spanish opens the Kai chat and the script loads
- **THEN** Kai's first lines are in Persian

#### Scenario: Chat in the learned language
- **WHEN** that learner picks Spanish on O10b
- **THEN** Kai's next lines are in Spanish with a Persian translation line under each

#### Scenario: English speaker
- **WHEN** an English speaker picks English on O10b
- **THEN** the lines are the English script and no script call is made

#### Scenario: Script fails
- **WHEN** the script call fails or takes longer than 4 seconds
- **THEN** the chat shows the English lines
