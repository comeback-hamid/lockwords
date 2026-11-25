# web/mobile Specification

## Purpose
What the app does differently when it runs in a browser: storage, the tab bar, Kai, pop-ups and the page layout.

## Requirements

### Requirement: The app runs in a browser
The web build SHALL open as one page app and offer the same flows as the phone app: onboarding, New words, Review, Progress, decks and Use it, against the same server. The page behind the app has the app's canvas color.

#### Scenario: First visit
- **WHEN** a person opens the web app for the first time
- **THEN** the first onboarding screen shows and no error is shown

#### Scenario: Wide window
- **WHEN** the window is 1200 px wide
- **THEN** the app is not a 430 px strip: the tabs are a side bar on the left and the screen is a centered column beside it

### Requirement: Guest session in the browser
On the first visit the web app SHALL sign in as a guest and keep the session in the browser's storage, so a reload keeps the same learner. Small app flags (onboarding finished, intro seen, review dot, speech language, streak) are kept the same way.

#### Scenario: Reload
- **WHEN** a learner who finished onboarding reloads the page
- **THEN** the tabs open with the same learner and onboarding does not start again

#### Scenario: No storage
- **WHEN** the browser has no storage (a server render or a blocked store)
- **THEN** reading a value answers nothing and the app does not crash

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

### Requirement: Kai on the web
On the web Kai SHALL move as on the phone: the same states, the same timing, one-shot states that return by themselves, and `talking` and `listening` over a resting state. Kai is drawn from the phone's character data and step function, with no extra download. With the system's reduced motion setting on, Kai is a still pose. A Kai that is not on screen does not draw.

#### Scenario: Kai waves on Hello
- **WHEN** a person opens the web app for the first time
- **THEN** Kai on the Hello screen is moving: two pictures of Kai taken one second apart are not the same

#### Scenario: Thinking
- **WHEN** Kai's state is "thinking" in a browser
- **THEN** Kai shows in the header and plays the thinking state

#### Scenario: A one-shot state returns
- **WHEN** Kai plays "celebrate" in a browser
- **THEN** Kai is back in its resting state after the state's time, with no new state sent by the screen

#### Scenario: Reduced motion
- **WHEN** the system's reduced motion setting is on
- **THEN** Kai is a still pose and two pictures taken one second apart are the same

#### Scenario: Hidden tab
- **WHEN** the browser tab is hidden
- **THEN** Kai stops drawing, and continues when the tab shows again

### Requirement: Pop-ups on the web
A question that needs a yes or no (for example "Remove this deck?") SHALL use the browser's own confirm dialog on the web, and the action runs only when the person agrees. A message with one button uses the browser's alert. On phones the system pop-up is used as before.

#### Scenario: Cancel
- **WHEN** the person cancels the browser's confirm for "Remove this deck?"
- **THEN** the deck is not removed

#### Scenario: Agree
- **WHEN** the person agrees
- **THEN** the deck is removed

### Requirement: The meadow on the web
On the web the meadow on Progress SHALL grow in when the page opens and then move in the wind, as on the phone: the same blocks, colors and motion numbers. With the system's reduced motion setting on, it is a still picture. A meadow that is not on screen does not draw.

#### Scenario: The meadow moves
- **WHEN** a learner with at least one deck opens Progress in a browser
- **THEN** the trees grow in, and two pictures of the meadow taken one second apart are not the same

#### Scenario: Reduced motion
- **WHEN** the system's reduced motion setting is on
- **THEN** the meadow is a still picture with every block in its place

### Requirement: A real keyboard on the web
In a browser a chat box SHALL send its text on Enter and make a new line on Shift+Enter. In a review round Space or Enter SHALL flip the card, the left arrow answers Hard, the up arrow Know it, the right arrow Easy, and Backspace or Z takes the last swipe back. The card keys do nothing while the person types in a text box, while a key is pressed with Ctrl, Alt or Cmd, and while another screen is on top of the round. (Built in `fix/web-parity`, 2026-11-25; written here so the spec is whole.)

#### Scenario: Enter sends
- **WHEN** a person types "hola" in a chat box and presses Enter
- **THEN** the message is sent and the box is empty

#### Scenario: Shift+Enter
- **WHEN** a person presses Shift+Enter in a chat box
- **THEN** a new line is added and nothing is sent

#### Scenario: Arrow answers the card
- **WHEN** a round shows a card and the person presses the right arrow
- **THEN** the card is answered Easy and the next card shows

#### Scenario: Keys under another screen
- **WHEN** Use it is open over the round and the person presses the right arrow outside a text box
- **THEN** no card is answered

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
