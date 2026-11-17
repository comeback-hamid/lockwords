# Spec Delta: onboarding/mobile

## MODIFIED Requirements

### Requirement: O8 Goal
O8 "Why are you learning?" SHALL list Travel, Work, Move abroad, Family & friends, Keep my brain active, School and Other, each with an icon. One can be selected. Continue is off until one is selected. Other shows a text box labelled "YOUR REASON" under the list (Figma O8b), up to 80 characters, and Continue stays off until it has text. Empty, loading, error and locked states do not apply.

#### Scenario: Pick a goal
- **WHEN** the user taps Travel
- **THEN** Travel is selected and Continue is on

#### Scenario: Other needs a reason
- **WHEN** the user taps Other
- **THEN** a text box labelled "YOUR REASON" shows and Continue is off

#### Scenario: Other with a reason
- **WHEN** the user taps Other, types "For my grandmother" and taps Continue
- **THEN** the goal `other` with the text "For my grandmother" is kept and O9 Interests shows

#### Scenario: Leaving Other hides the box
- **WHEN** the user taps Other, then taps Work
- **THEN** the text box is gone and Continue is on

### Requirement: O9 Interests
O9 "What are you into?" SHALL show 20 tiles in three columns (Food, Travel, Work, Business, Tech, Science, Music, Movies, Books, Sports, Health, Nature, Animals, Art, News, Family, Friends & dating, Shopping, Money, Culture). The user picks 1 to 5. A label shows "N SELECTED". Continue is off with none selected. Empty, loading and locked states do not apply; the save error is in "Finishing saves the profile".

#### Scenario: Select tiles
- **WHEN** the user taps Food and Music
- **THEN** both tiles are green with a check and the label reads "2 SELECTED"

#### Scenario: Twenty tiles
- **WHEN** O9 shows
- **THEN** there are 20 tiles and none of them is Cooking, Fitness, Fashion or Gaming

## ADDED Requirements

### Requirement: O9 five picked
When 5 interests are picked, O9 SHALL fade every other tile, make it not tappable (reported as disabled), and show the label "5 OF 5 PICKED" (Figma O9b). A picked tile can still be tapped to unpick it. Then the other tiles can be picked again and the label goes back to "4 SELECTED".

#### Scenario: Fifth pick locks the rest
- **WHEN** the user picks Food, Travel, Music, Movies and Books
- **THEN** the label reads "5 OF 5 PICKED" and every other tile is disabled

#### Scenario: A sixth tap does nothing
- **WHEN** 5 are picked and the user taps Work
- **THEN** Work is not picked and the label still reads "5 OF 5 PICKED"

#### Scenario: Unpick frees the rest
- **WHEN** 5 are picked and the user taps Books
- **THEN** Books is not picked, the label reads "4 SELECTED" and Work can be picked
