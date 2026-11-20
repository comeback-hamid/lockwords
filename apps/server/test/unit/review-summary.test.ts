import { expect, test } from 'vitest';

import { streakDays, todayNumbers } from '../../src/review/summary.js';

test('streak: review days in a row, ending today', () => {
  expect(streakDays(['2026-11-20', '2026-11-19', '2026-11-18'], '2026-11-20')).toBe(3);
  expect(streakDays(['2026-11-20', '2026-11-18'], '2026-11-20')).toBe(1); // missed yesterday
  expect(streakDays(['2026-11-20'], '2026-11-20')).toBe(1);
  expect(streakDays([], '2026-11-20')).toBe(0);
});

test('streak: today has no swipe yet, so it ends yesterday; older than that is lost', () => {
  expect(streakDays(['2026-11-19', '2026-11-18'], '2026-11-20')).toBe(2);
  expect(streakDays(['2026-11-18', '2026-11-17'], '2026-11-20')).toBe(0);
});

test('streak crosses a month', () => {
  expect(streakDays(['2026-12-01', '2026-11-30', '2026-11-29'], '2026-12-01')).toBe(3);
});

const at = (s: number) => new Date(Date.UTC(2026, 10, 20, 10, 0, s));
const ev = (cardId: string, kind: 'easy' | 'hard' | 'known' | 'use_it', s: number, stage: number) => ({ cardId, kind, at: at(s), stage });

test('today: each word counts once, by its last swipe; levels in the order the words were first seen', () => {
  const n = todayNumbers([ev('a', 'easy', 0, 2), ev('b', 'hard', 10, 1), ev('c', 'known', 20, 3), ev('b', 'easy', 30, 2)]);
  expect(n).toMatchObject({ words: 3, easy: 2, hard: 0, known: 1, stages: [2, 2, 3] });
});

test('today: a good Use it sentence counts as Easy', () => {
  expect(todayNumbers([ev('a', 'use_it', 0, 4)])).toMatchObject({ words: 1, easy: 1, stages: [4] });
});

test('minutes: gaps are added, a long break counts as 60 seconds, 1 minute at least', () => {
  expect(todayNumbers([ev('a', 'easy', 0, 2)]).minutes).toBe(1);
  expect(todayNumbers([ev('a', 'easy', 0, 2), ev('b', 'easy', 50, 2), ev('c', 'easy', 100, 2), ev('d', 'easy', 1300, 2)]).minutes).toBe(3); // 50 + 50 + 60 = 160 s
  expect(todayNumbers([]).minutes).toBe(0);
});
