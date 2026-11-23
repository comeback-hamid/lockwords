// The numbers of the Progress tab (Figma P1–P3). Pure: rows in, numbers out. Hamid's rules of 2026-11-20:
// new = not reviewed yet; learning = stage 1 to 4; mastered = stage 5, and every "I know it" word.
export type Word = { stage: number; known: boolean; hard: boolean };

const MASTERED_STAGE = 5;
const GOAL_STEP = 100;
const DAYS_TO_MASTER = 24; // from the first Easy (stage 2) to stage 5: 3 + 7 + 14 days
const PACE_DAYS = 7;
const MIN_PACE = 5;
const MAX_PACE = 20; // the daily limit of new words
const DAY_MS = 86_400_000;

const highestFirst = (a: number, b: number) => b - a;

export function bankNumbers(words: Word[]) {
  const toLearn = words.filter((w) => !w.known);
  return {
    total: words.length,
    new: toLearn.filter((w) => w.stage === 0).length,
    learning: toLearn.filter((w) => w.stage > 0 && w.stage < MASTERED_STAGE).length,
    mastered: words.filter((w) => w.known || w.stage >= MASTERED_STAGE).length,
    toLearn: toLearn.length, // the bank without "I know it" words
    started: toLearn.filter((w) => w.stage > 0).length,
    grid: toLearn.map((w) => w.stage).sort(highestFirst), // one square per word to learn
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
    stages: words.map((w) => (w.known ? MASTERED_STAGE : w.stage)).sort(highestFirst),
  };
}

// One tree of the meadow: the levels of the deck's words that were met (stage 1 or higher; known = 5), highest first.
export const treeLevels = (words: Word[]) =>
  words
    .filter((w) => w.known || w.stage > 0)
    .map((w) => (w.known ? MASTERED_STAGE : w.stage))
    .sort(highestFirst);
