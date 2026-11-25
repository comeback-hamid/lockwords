import { expect, test } from 'vitest';

import { bankNumbers, deckSummary, futureStops, goalFor, levelFor, masterBy, paceFrom } from '../../src/progress/numbers.js';

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

test('the future bar: each stop has its day at the learner’s pace, and the level of the vocabulary by then', () => {
  const stops = futureStops('2026-11-20', 30, 10, 2000);
  expect(stops.map((s) => s.words)).toEqual([100, 200, 500, 1000]);
  expect(stops[0]).toEqual({ words: 100, by: '2026-12-21', vocabulary: 2100, level: 'A2' }); // 7 days to start 70 words + 24
  expect(stops[2]).toMatchObject({ vocabulary: 2500, level: 'B1' });
  expect(stops[3]!.by > stops[2]!.by).toBe(true);
  // No word test: no vocabulary and no level, only the days.
  expect(futureStops('2026-11-20', 0, 5, null)[0]).toEqual({ words: 100, by: '2027-01-03' });
});

test('the level for a vocabulary size follows the word test’s table, and never promises C2', () => {
  expect([0, 1499, 1500, 2499, 2500, 3249, 3250, 3749, 3750, 9000].map(levelFor)).toEqual(['A1', 'A1', 'A2', 'A2', 'B1', 'B1', 'B2', 'B2', 'C1', 'C1']);
});
