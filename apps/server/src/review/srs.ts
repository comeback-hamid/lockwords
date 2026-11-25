// Spaced repetition rules (docs/product.md 7.5). The server owns them; `now` is passed in.
export type Direction = 'easy' | 'hard' | 'known';
export type CardState = { stage: number; known: boolean; hard: boolean; dueAt: Date | null };

const DAY_MS = 86_400_000;
const BACK_IN_DAYS = [1, 3, 7, 14, 30]; // stage 1..5
const NEW_CARD_EASY_STAGE = 2; // Easy on a new card skips stage 1 (Figma A5b: "BACK IN 3 DAYS")
const HARD_UNTIL_STAGE = 3; // a hard word stays on the lock screen until it reaches this stage

export function applySwipe(card: CardState, direction: Direction, now: Date): CardState & { backInDays: number | null } {
  if (direction === 'known') return { stage: card.stage, known: true, hard: false, dueAt: null, backInDays: null };
  const stage = direction === 'hard' ? 1 : card.stage === 0 ? NEW_CARD_EASY_STAGE : Math.min(card.stage + 1, 5);
  const backInDays = BACK_IN_DAYS[stage - 1]!;
  const hard = direction === 'hard' || (card.hard && stage < HARD_UNTIL_STAGE);
  return { stage, known: false, hard, dueAt: new Date(now.getTime() + backInDays * DAY_MS), backInDays };
}

// What the learner already did today (swipes that were not undone), as the server needs it to judge one more swipe.
export type Today = { swipesToday: Direction[]; newStartedToday: number; usedItToday?: boolean }; // usedItToday: a good sentence already moved this card today

// Is this card in today's round? Due cards and every new card (no daily limit: Hamid, 2026-11-24). A card is swiped
// once a day: a Hard word does not come back in the same round (Hamid, 2026-11-24; it did once, from 2026-11-20).
export function canSwipe(card: CardState, today: Today, dayEnd: Date): boolean {
  if (card.known) return false;
  if (today.swipesToday.length > 0) return false; // already swiped today (also stops a double send)
  if (card.stage === 0) return true;
  return card.dueAt !== null && card.dueAt < dayEnd;
}

// Use it is offered on every card, always (Hamid, 2026-11-25; from 2026-11-20 it started at stage 3).
// The field stays in the API so the rule can change on the server without a new app build.
export const canUseIt = () => true;

type Pickable = CardState & { deckCreatedAt: Date; position: number };

// Today's round: due cards (oldest due first), then every new card (oldest deck first, in deck order).
// `until` is the end of the review day: a card due any time today is in.
export function pickRound<T extends Pickable>(cards: T[], until: Date): T[] {
  const live = cards.filter((c) => !c.known);
  const due = live.filter((c) => c.stage > 0 && c.dueAt !== null && c.dueAt <= until).sort((a, b) => a.dueAt!.getTime() - b.dueAt!.getTime());
  const fresh = live.filter((c) => c.stage === 0).sort((a, b) => a.deckCreatedAt.getTime() - b.deckCreatedAt.getTime() || a.position - b.position);
  return [...due, ...fresh];
}
