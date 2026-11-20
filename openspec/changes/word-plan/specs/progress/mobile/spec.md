## ADDED Requirements

### Requirement: Word plan on the Progress tab
Under the meadow the Progress tab SHALL show "YOUR WORD PLAN · <GOAL>" and the plan's ideas, each with its topic and "N words · <kind>". The plan loads after the numbers; while it loads, when it is empty, or when it cannot be loaded, the section is not shown. Tapping an idea opens the New words tab, where the chat asks Kai for "A deck about <topic>".

#### Scenario: Three ideas
- **WHEN** the plan has three ideas and the goal "travel"
- **THEN** "YOUR WORD PLAN · TRAVEL" and the three topics with their sizes show

#### Scenario: Tap
- **WHEN** the user taps "Getting around the city"
- **THEN** the New words tab opens and "A deck about Getting around the city" is sent to Kai

#### Scenario: No plan
- **WHEN** the plan is empty or cannot be loaded
- **THEN** there is no word plan section
