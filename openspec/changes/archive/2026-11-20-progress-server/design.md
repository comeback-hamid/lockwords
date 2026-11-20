## Decisions
- **All counting is one pure module** (`src/progress/numbers.ts`); the store only reads rows. Words = cards that are not removed, in ready decks that are not removed.
- **Words to learn** = the bank without "I know it" words. The goal is the next hundred strictly above that number (52 → 100, 100 → 200).
- **The grid** is the levels of the words to learn, highest first. The app draws the rest of the goal as empty squares.
- **The date:** words not started yet are started at the learner's pace, then a word needs 24 days from its first Easy to reach Stage 5 (3 + 7 + 14). Pace = new words started per day over the last 7 review days, never under 5 and never over 20 (the daily limit). `masterBy = today + ceil((goal − started) / pace) + 24 days`.
- **Hard and known flags on deck cards are sent only when true**, so old callers and tests see the same shape.
- **Restore** sets `known` to false and makes a reviewed word due today. No history row (it is not a review).
- **A deck's round** is today's round filtered to that deck: the daily limit and the review day stay as they are.
