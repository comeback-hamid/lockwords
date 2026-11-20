import { expect, test } from 'vitest';

import { bankNumbers, deckSummary, goalFor, masterBy, paceFrom } from '../../src/progress/numbers.js';

const w = (stage: number, over: Partial<{ known: boolean; hard: boolean }> = {}) => ({ stage, known: false, hard: false, ...over });

test('counts: new, learning, mastered; known words count as mastered and are not in the grid', () => {
  const words = [w(0), w(0), w(0), w(0), w(2), w(2), w(2), w(5), w(5), w(3, { known: true })];
  expect(bankNumbers(words)).toEqual({ total: 10, new: 4, learning: 3, mastered: 3, toLearn: 9, started: 5, grid: [5, 5, 2, 2, 2, 0, 0, 0, 0] });
  expect(bankNumbers([])).toEqual({ total: 0, new: 0, learning: 0, mastered: 0, toLearn: 0, started: 0, grid: [] });
});

test('goal: the next hundred strictly above the words to learn', () => {
  expect([0, 52, 99, 100, 101, 250].map(goalFor)).toEqual([100, 100, 100, 200, 200, 300]);
});

test('pace: new words started per day over the last 7 days, 5 at least and 20 at most', () => {
  expect(paceFrom(70)).toBe(10);
  expect(paceFrom(0)).toBe(5);
  expect(paceFrom(14)).toBe(5);
  expect(paceFrom(700)).toBe(20);
});

test('date: days to start the missing words at that pace, plus 24 days', () => {
  expect(masterBy('2026-11-20', 100, 30, 10)).toBe('2026-12-21');
  expect(masterBy('2026-11-20', 100, 100, 10)).toBe('2026-12-14'); // every word is started: 24 days
  expect(masterBy('2026-11-20', 100, 0, 5)).toBe('2027-01-03'); // 20 days + 24
});

test('a deck: words, learning, hard, levels highest first (known counts as 5)', () => {
  expect(deckSummary([w(0), w(2, { hard: true }), w(1), w(4, { known: true }), w(5)])).toEqual({ words: 5, learning: 2, hard: 1, stages: [5, 5, 2, 1, 0] });
});
