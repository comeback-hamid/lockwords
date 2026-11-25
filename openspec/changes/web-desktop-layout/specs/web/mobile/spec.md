## MODIFIED Requirements

### Requirement: The app runs in a browser
The web build SHALL open as one page app and offer the same flows as the phone app: onboarding, New words, Review, Progress, decks and Use it, against the same server. The page behind the app has the app's canvas color.

#### Scenario: First visit
- **WHEN** a person opens the web app for the first time
- **THEN** the first onboarding screen shows and no error is shown

#### Scenario: Wide window
- **WHEN** the window is 1200 px wide
- **THEN** the app is not a 430 px strip: the tabs are a side bar on the left and the screen is a centered column beside it

### Requirement: Tab bar on the web
On the web the three tabs SHALL be New words, Review and Progress, with their icons and the red dot on Review when new words wait. On a window narrower than 1024 px they are a bar at the bottom. On a window 1024 px or wider they are a side bar on the left: the Lockwords mark and name on top, then one row per tab; the open tab's row has a grey background. A learner who has not finished onboarding is sent to onboarding, as on the phone.

#### Scenario: Three tabs
- **WHEN** the tabs show in a window 390 px wide
- **THEN** the bar is at the bottom and does not cover the screen's content

#### Scenario: Side bar on a wide window
- **WHEN** the tabs show in a window 1440 px wide
- **THEN** the three tabs are rows in a side bar on the left, and no bar is at the bottom

#### Scenario: Open a tab from the side bar
- **WHEN** the person clicks Progress in the side bar
- **THEN** the Progress screen shows and its row is marked as open

## ADDED Requirements

### Requirement: Window sizes on the web
The web app SHALL lay itself out by the window's width. Under 600 px: the app fills the window. From 600 px: a tab screen is one centered column at most 600 px wide (480 px for Review), and a screen outside the tabs (onboarding, Use it, a deck page, the first round and the one-time screens after it) is one centered column 480 px wide. Parts that size themselves from the screen (the deck ideas row) use the column's width, not the window's.

#### Scenario: Phone-size window
- **WHEN** the window is 390 px wide
- **THEN** every screen is as wide as the window

#### Scenario: Wide window, a tab
- **WHEN** New words shows in a window 1440 px wide
- **THEN** the chat is a centered column 600 px wide beside the side bar

#### Scenario: Wide window, Review
- **WHEN** a round shows in a window 1440 px wide
- **THEN** the word card is 480 px wide at most (less its side margins) and centered

#### Scenario: Wide window, onboarding
- **WHEN** an onboarding question shows in a window 1440 px wide
- **THEN** it is a centered column 480 px wide and no side bar shows

#### Scenario: The window gets narrower
- **WHEN** a 1440 px window is made 800 px wide
- **THEN** the side bar goes away and the tab bar is at the bottom
