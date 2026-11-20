// Spaced repetition rules (docs/product.md 7.5). The server owns them; `now` is passed in.
export type Direction = 'easy' | 'hard' | 'known';
export type CardState = { stage: number; known: boolean; hard: boolean; dueAt: Date | null };

const DAY_MS = 86_400_000;
const BACK_IN_DAYS = [1, 3, 7, 14, 30]; // stage 1..5
const NEW_CARD_EASY_STAGE = 2; // Easy on a new card skips stage 1 (Figma A5b: "BACK IN 3 DAYS")
const HARD_UNTIL_STAGE = 3; // a hard word stays on the lock screen until it reaches this stage
export const MAX_NEW_PER_DAY = 20;
export const MAX_NEW_PER_ROUND = MAX_NEW_PER_DAY; // the old name, still used by callers

export function applySwipe(card: CardState, direction: Direction, now: Date): CardState & { backInDays: number | null } {
  if (direction === 'known') return { stage: card.stage, known: true, hard: false, dueAt: null, backInDays: null };
  const stage = direction === 'hard' ? 1 : card.stage === 0 ? NEW_CARD_EASY_STAGE : Math.min(card.stage + 1, 5);
  const backInDays = BACK_IN_DAYS[stage - 1]!;
  const hard = direction === 'hard' || (card.hard && stage < HARD_UNTIL_STAGE);
  return { stage, known: false, hard, dueAt: new Date(now.getTime() + backInDays * DAY_MS), backInDays };
}

// What the learner already did today (swipes that were not undone), as the server needs it to judge one more swipe.
export type Today = { swipesToday: Direction[]; newStartedToday: number };

// Is this card in today's round? Due cards, new cards under the daily limit, and one more showing after a first Hard.
export function canSwipe(card: CardState, today: Today, dayEnd: Date): boolean {
  if (card.known) return false;
  if (today.swipesToday.length === 1 && today.swipesToday[0] === 'hard') return true; // the second showing
  if (today.swipesToday.length > 0) return false; // already swiped today (also stops a double send)
  if (card.stage === 0) return today.newStartedToday < MAX_NEW_PER_DAY;
  return card.dueAt !== null && card.dueAt < dayEnd;
}

// The first Hard of the day brings the card back once at the end of the same round.
export const showsAgain = (direction: Direction, today: Today) => direction === 'hard' && today.swipesToday.length === 0;

type Pickable = CardState & { deckCreatedAt: Date; position: number };

// Today's round: due cards (oldest due first), then new cards (oldest deck first, in deck order, 20 at most).
// `until` is the end of the review day: a card due any time today is in.
export function pickRound<T extends Pickable>(cards: T[], until: Date, newLeft = MAX_NEW_PER_DAY): T[] {
  const live = cards.filter((c) => !c.known);
  const due = live.filter((c) => c.stage > 0 && c.dueAt !== null && c.dueAt <= until).sort((a, b) => a.dueAt!.getTime() - b.dueAt!.getTime());
  const fresh = live
    .filter((c) => c.stage === 0)
    .sort((a, b) => a.deckCreatedAt.getTime() - b.deckCreatedAt.getTime() || a.position - b.position)
    .slice(0, Math.max(0, newLeft));
  return [...due, ...fresh];
}
