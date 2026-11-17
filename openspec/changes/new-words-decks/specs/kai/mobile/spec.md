## MODIFIED Requirements

### Requirement: Deck card
The deck card SHALL show the level and word count ("A2+ · 10 WORDS") and the title in quotes, in one of four states: proposed (the reason line and a Generate button), generating ("Making your deck…", a progress bar and "n / 10 WORDS", no button), ready ("JUST NOW", ten level squares and "10 WORDS · IN YOUR WORD LIST"; tapping it opens the deck), disabled (grayed, no button, not tappable). When translations are on and the deck has a title translation, it shows under the title in one line of smaller gray text; the card grows if the title needs more room.

#### Scenario: States
- **WHEN** the card is shown as proposed, then generating, then ready
- **THEN** it shows the Generate button, then the progress bar with no button, then "IN YOUR WORD LIST"

#### Scenario: Translation
- **WHEN** a card with the title "Pedir comida" and the translation "Ordering food" is shown with translations on, then off
- **THEN** "Ordering food" shows under the title, then does not

#### Scenario: Disabled
- **WHEN** a card is shown as disabled
- **THEN** it has no Generate button and tapping it does nothing
