import { useSyncExternalStore } from 'react';

import type { ReviewCard } from '@/api/client';

// Today's round: loaded by the Review tab, walked by the round screen, read by Use it.
let round: { cards: ReviewCard[]; index: number } = { cards: [], index: 0 };
const listeners = new Set<() => void>();
const set = (next: typeof round) => {
  round = next;
  listeners.forEach((l) => l());
};

export const getRound = () => round;
export const setRound = (cards: ReviewCard[]) => set({ cards, index: 0 });
export const advance = () => set({ ...round, index: round.index + 1 });
// The server sends a Hard card back once the same day: it goes to the end of the round.
export const showAgain = (card: ReviewCard) => set({ ...round, cards: [...round.cards, card] });
export const findCard = (id: string) => round.cards.find((c) => c.id === id) ?? null;
export function useRound() {
  return useSyncExternalStore((l) => (listeners.add(l), () => listeners.delete(l)), getRound, getRound);
}
