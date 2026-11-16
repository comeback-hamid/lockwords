// Spaced repetition rules (product.md §6). The server owns them; `now` is passed in.
export type Direction = 'easy' | 'hard' | 'known';
export type CardState = { stage: number; known: boolean; hard: boolean; dueAt: Date | null };

const DAY_MS = 86_400_000;
const BACK_IN_DAYS = [1, 3, 7, 14, 30]; // stage 1..5
const MAX_NEW_PER_ROUND = 20;

export function applySwipe(card: CardState, direction: Direction, now: Date): CardState & { backInDays: number | null } {
  if (direction === 'known') return { stage: card.stage, known: true, hard: false, dueAt: null, backInDays: null };
  const stage = direction === 'hard' ? 1 : Math.min(card.stage + 1, 5);
  const backInDays = BACK_IN_DAYS[stage - 1]!;
  return { stage, known: false, hard: direction === 'hard', dueAt: new Date(now.getTime() + backInDays * DAY_MS), backInDays };
}

type Pickable = CardState & { deckCreatedAt: Date; position: number };

// Today's round: due cards (oldest due first), then up to 20 new cards (oldest deck first, in deck order).
export function pickRound<T extends Pickable>(cards: T[], now: Date): T[] {
  const live = cards.filter((c) => !c.known);
  const due = live.filter((c) => c.stage > 0 && c.dueAt !== null && c.dueAt <= now).sort((a, b) => a.dueAt!.getTime() - b.dueAt!.getTime());
  const fresh = live
    .filter((c) => c.stage === 0)
    .sort((a, b) => a.deckCreatedAt.getTime() - b.deckCreatedAt.getTime() || a.position - b.position)
    .slice(0, MAX_NEW_PER_ROUND);
  return [...due, ...fresh];
}
