import { useSyncExternalStore } from 'react';

import type { ReviewCard } from '@/api/client';

// Today's round: loaded by the Review tab, walked by the round screen, read by Use it.
// `added` = the last swipe put a copy of its card at the end (a first Hard), so an undo knows to take it out.
let round: { cards: ReviewCard[]; index: number; added?: boolean } = { cards: [], index: 0 };
const listeners = new Set<() => void>();
const set = (next: typeof round) => {
  round = next;
  listeners.forEach((l) => l());
};

export const getRound = () => round;
export const setRound = (cards: ReviewCard[]) => set({ cards, index: 0 });
export const advance = () => set({ ...round, index: round.index + 1, added: false });
// After a swipe: on to the next card, at once. The save runs in the background (src/review/saver.ts).
export const swiped = () => set({ ...round, index: round.index + 1, added: false });
// The server sends this card back once more today (a first Hard): a copy goes to the end of the round.
// `added` is set only when the copy belongs to the last swipe, so Undo takes out the right one.
export const cameBack = (card: ReviewCard) => set({ ...round, cards: [...round.cards, card], added: round.cards[round.index - 1]?.id === card.id });
// A swipe could not be saved: its card is the next card again. Nothing else in the round moves.
export function putBack(card: ReviewCard) {
  const at = round.cards.findIndex((c, i) => i < round.index && c.id === card.id);
  if (at < 0) return;
  const cards = round.cards.filter((_, i) => i !== at);
  cards.splice(round.index - 1, 0, card);
  set({ cards, index: round.index - 1, added: false });
}
// The server took the last swipe back: that card is current again, as the server now has it.
export function undone(card: ReviewCard) {
  if (round.index === 0) return;
  const cards = round.added ? round.cards.slice(0, -1) : [...round.cards];
  cards[round.index - 1] = card;
  set({ cards, index: round.index - 1, added: false });
}
// The server sends a Hard card back once the same day: it goes to the end of the round.
export const showAgain = (card: ReviewCard) => set({ ...round, cards: [...round.cards, card] });
// Words made while a round is open (a new deck, a word from Kai) join at the end of it. Cards already in the round,
// swiped or not, are left as they are.
export function addToRound(cards: ReviewCard[]) {
  const have = new Set(round.cards.map((c) => c.id));
  const fresh = cards.filter((c) => !have.has(c.id));
  if (fresh.length) set({ ...round, cards: [...round.cards, ...fresh] });
}
// The word tapped on the widget while a round is open: it is the current card now. If it was still to come in this
// round, it moves up; a card already swiped today comes as the server sent it (a look card).
export function putFirst(card: ReviewCard) {
  const ahead = round.cards.findIndex((c, i) => i >= round.index && c.id === card.id);
  const cards = ahead >= 0 ? round.cards.filter((_, i) => i !== ahead) : [...round.cards];
  cards.splice(round.index, 0, ahead >= 0 ? round.cards[ahead]! : card);
  set({ ...round, cards, added: false });
}
// Is the round on screen inside the Review tab? Kept here, not in the screen: opening the app from a widget tap can
// build the tab's screen again, and the round must still be there.
let openInTab = false;
export const setOpenInTab = (open: boolean) => void (openInTab = open);
export const isOpenInTab = () => openInTab && round.index < round.cards.length;
export const findCard = (id: string) => round.cards.find((c) => c.id === id) ?? null;
export function useRound() {
  return useSyncExternalStore((l) => (listeners.add(l), () => listeners.delete(l)), getRound, getRound);
}

// The round opened Use it over the Review tab. When the tab comes back into view it keeps the round where it was
// (it does not load a new one). Read once.
let awayForUseIt = false;
export const leftForUseIt = () => void (awayForUseIt = true);
export function backFromUseIt() {
  const was = awayForUseIt;
  awayForUseIt = false;
  return was;
}
