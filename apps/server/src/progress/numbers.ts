// The numbers of the Progress tab (Figma P1–P3). Pure: rows in, numbers out. Hamid's rules of 2026-11-20:
// new = not reviewed yet; learning = stage 1 to 4; mastered = stage 5, and every "I know it" word.
// One rule for every picture (Hamid, 2026-11-25): an "I know it" word is a mastered word everywhere, level 5. The
// words map, the meadow and a deck's squares all draw the same levels the numbers count.
export type Word = { stage: number; known: boolean; hard: boolean };

const MASTERED_STAGE = 5;
const GOAL_STEP = 100;
const DAYS_TO_MASTER = 24; // from the first Easy (stage 2) to stage 5: 3 + 7 + 14 days
const PACE_DAYS = 7;
const MIN_PACE = 5;
const MAX_PACE = 20; // the daily limit of new words
const DAY_MS = 86_400_000;

const highestFirst = (a: number, b: number) => b - a;
// The level a word is drawn with: its stage, or 5 once it is "I know it".
export const levelOf = (w: Word) => (w.known ? MASTERED_STAGE : w.stage);

export function bankNumbers(words: Word[]) {
  const toLearn = words.filter((w) => !w.known);
  return {
    total: words.length,
    new: toLearn.filter((w) => w.stage === 0).length,
    learning: toLearn.filter((w) => w.stage > 0 && w.stage < MASTERED_STAGE).length,
    mastered: words.filter((w) => w.known || w.stage >= MASTERED_STAGE).length,
    toLearn: toLearn.length, // the bank without "I know it" words
    started: toLearn.filter((w) => w.stage > 0).length,
    grid: words.map(levelOf).sort(highestFirst), // one square per word of the bank; "I know it" = level 5
  };
}

// Hard words: swiped Hard and not yet back at level 3, without "I know it" words. The same rule as the hard words list.
export const hardCount = (words: Word[]) => words.filter((w) => w.hard && !w.known).length;

// The next hundred strictly above the words to learn: 52 → 100, 100 → 200.
export const goalFor = (toLearn: number) => (Math.floor(toLearn / GOAL_STEP) + 1) * GOAL_STEP;

// New words started per day over the last 7 review days, kept between 5 and 20.
export const paceFrom = (startedInLastWeek: number) => Math.min(MAX_PACE, Math.max(MIN_PACE, Math.round(startedInLastWeek / PACE_DAYS)));

// The day the goal is mastered: the missing words are started at the pace, and the last one needs 24 more days.
export function masterBy(today: string, goal: number, started: number, pace: number): string {
  const days = Math.ceil(Math.max(0, goal - started) / pace) + DAYS_TO_MASTER;
  return new Date(Date.parse(`${today}T00:00:00Z`) + days * DAY_MS).toISOString().slice(0, 10);
}

// One deck in the deck list. A known word shows as a full square.
export function deckSummary(words: Word[]) {
  return {
    words: words.length,
    learning: words.filter((w) => !w.known && w.stage > 0 && w.stage < MASTERED_STAGE).length,
    hard: words.filter((w) => w.hard && !w.known).length,
    stages: words.map(levelOf).sort(highestFirst),
  };
}

// One tree of the meadow: the levels of the deck's words that were met (stage 1 or higher; known = 5), highest first.
export const treeLevels = (words: Word[]) =>
  words
    .filter((w) => w.known || w.stage > 0)
    .map((w) => (w.known ? MASTERED_STAGE : w.stage))
    .sort(highestFirst);

// "In 3 months" on the Progress tab (Hamid, 2026-11-25): the same page as today, as it will look 90 days from now
// if the learner keeps the pace of the last week. A guess, so the total is rounded to ten and shown with "about".
export const FUTURE_DAYS = 90;
const DEFAULT_DECK_WORDS = 20;
// Days from a word's first Easy to each level: level 2 at once, 3 after 3 days, 4 after 10, mastered after 24.
const TO_LEVEL_3 = 3;
const TO_LEVEL_4 = 10;

export function futureNumbers(today: string, now: { total: number; mastered: number; decks: number }, pace: number) {
  const total = Math.round((now.total + pace * FUTURE_DAYS) / 10) * 10;
  // Everything started more than 24 days before that day is mastered; the rest is on its way up.
  const learning = Math.min(total - now.mastered, pace * DAYS_TO_MASTER);
  const mastered = total - learning;
  const level2 = Math.min(learning, pace * TO_LEVEL_3);
  const level3 = Math.min(learning - level2, pace * (TO_LEVEL_4 - TO_LEVEL_3));
  const level4 = learning - level2 - level3;
  const perDeck = now.decks > 0 && now.total > 0 ? now.total / now.decks : DEFAULT_DECK_WORDS;
  return {
    by: new Date(Date.parse(`${today}T00:00:00Z`) + FUTURE_DAYS * DAY_MS).toISOString().slice(0, 10),
    total,
    new: 0,
    learning,
    mastered,
    // The words map then: one level per word, highest first.
    grid: [...Array<number>(mastered).fill(MASTERED_STAGE), ...Array<number>(level4).fill(4), ...Array<number>(level3).fill(3), ...Array<number>(level2).fill(2)],
    moreDecks: Math.max(0, Math.round((total - now.total) / perDeck)),
  };
}
