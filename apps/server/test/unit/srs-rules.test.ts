import { expect, test } from 'vitest';

import { applySwipe, canSwipe } from '../../src/review/srs.js';

const now = new Date('2026-11-20T10:00:00Z');
const dayEnd = new Date('2026-11-21T04:00:00Z');
const days = (n: number) => new Date(now.getTime() + n * 86_400_000);
const card = (over: Partial<{ stage: number; known: boolean; hard: boolean; dueAt: Date | null }> = {}) => ({ stage: 0, known: false, hard: false, dueAt: null, ...over });
const none = { swipesToday: [] as ('easy' | 'hard' | 'known')[], newStartedToday: 0 };

test('Easy on a new card gives stage 2, back in 3 days; other cards go up one stage', () => {
  expect(applySwipe(card(), 'easy', now)).toMatchObject({ stage: 2, backInDays: 3, dueAt: days(3) });
  expect(applySwipe(card({ stage: 1 }), 'easy', now)).toMatchObject({ stage: 2, backInDays: 3 });
  expect(applySwipe(card({ stage: 2 }), 'easy', now)).toMatchObject({ stage: 3, backInDays: 7 });
  expect(applySwipe(card({ stage: 5 }), 'easy', now)).toMatchObject({ stage: 5, backInDays: 30 });
});

test('a hard word stays hard until it reaches stage 3; known clears it', () => {
  expect(applySwipe(card({ stage: 1, hard: true }), 'easy', now)).toMatchObject({ stage: 2, hard: true });
  expect(applySwipe(card({ stage: 2, hard: true }), 'easy', now)).toMatchObject({ stage: 3, hard: false });
  expect(applySwipe(card({ stage: 1, hard: true }), 'known', now)).toMatchObject({ known: true, hard: false });
  expect(applySwipe(card({ stage: 4 }), 'hard', now)).toMatchObject({ stage: 1, hard: true, backInDays: 1 });
});

test('a card can be swiped only when it is in today’s round', () => {
  expect(canSwipe(card(), none, dayEnd)).toBe(true); // new
  expect(canSwipe(card(), { ...none, newStartedToday: 500 }, dayEnd)).toBe(true); // no daily limit of new words (Hamid, 2026-11-24)
  expect(canSwipe(card({ stage: 2, dueAt: new Date('2026-11-21T03:00:00Z') }), none, dayEnd)).toBe(true); // due before the day ends
  expect(canSwipe(card({ stage: 2, dueAt: days(5) }), none, dayEnd)).toBe(false); // not due
  expect(canSwipe(card({ stage: 2, dueAt: days(-1), known: true }), none, dayEnd)).toBe(false); // known
});

test('a card is swiped once a day: a Hard word does not come back the same day (Hamid, 2026-11-24)', () => {
  const afterHard = card({ stage: 1, hard: true, dueAt: days(1) });
  expect(canSwipe(afterHard, { ...none, swipesToday: ['hard'] }, dayEnd)).toBe(false);
  expect(canSwipe(card({ stage: 2, dueAt: days(3) }), { ...none, swipesToday: ['easy'] }, dayEnd)).toBe(false); // a double send
});
