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

### Requirement: The review card's keys are named on a wide window
On a window 1024 px or wider the round SHALL show one quiet line under the card that names the keys: Space flip, left arrow hard, up arrow know it, right arrow easy, Backspace undo. The line does not show on a narrower window, on the streak card, or on the phone app.

#### Scenario: Wide window
- **WHEN** a round shows in a window 1440 px wide
- **THEN** the key names show under the card

#### Scenario: Phone-size window
- **WHEN** a round shows in a window 390 px wide
- **THEN** no key names show

### Requirement: A phone's browser
In a phone's browser the web app SHALL behave like an app: a finger swipes the review card without the page scrolling or being pulled; tapping a text box does not make the browser zoom the page (text boxes are 16 px on touch screens); a tap shows no grey flash; a long press does not select a button's text. The person can still zoom the page with two fingers.

#### Scenario: Finger swipe
- **WHEN** a finger drags the card to the left past the swipe distance in a phone's browser
- **THEN** the card is answered Hard and the next card shows

#### Scenario: Text box
- **WHEN** the Use it text box shows on a touch screen
- **THEN** its text is 16 px

### Requirement: A mouse
With a mouse a control (button, tab, option) SHALL get a little darker under the pointer, and the review card shows it can be grabbed. A touch screen gets no hover look.

#### Scenario: Hover
- **WHEN** the pointer is over the Start button in a desktop browser
- **THEN** the button is drawn a little darker

### Requirement: Add to the home screen
The web app SHALL carry what a phone needs to put it on the home screen: its name, its icon in two sizes, its background color, and that it opens without the browser's bars. The page also carries a short description and the app's background color for the browser's bars, and is never white before the app draws.

#### Scenario: Manifest
- **WHEN** a browser reads the page
- **THEN** it finds the manifest with the name Lockwords, the start address and two icons that exist

### Requirement: The open tab is said to a screen reader
In a browser the open tab SHALL be marked as selected, in the bottom bar and in the side bar.

#### Scenario: Selected
- **WHEN** New words is open in a browser
- **THEN** its tab is marked selected and the other two are not
