import { expect, test } from 'vitest';

import { bandForProfile, deckBand } from '../../src/decks/band.js';

// docs/vocab-engine.md 2.1: the test result wins; with no result, the self-rating.
test('deck band from level and word-test result', () => {
  const cases = [
    ['brand_new', 2000, 0],
    ['advanced', 400, 1],
    ['beginner', 1499, 2],
    ['some_basics', 3249, 3],
    ['beginner', 3250, 4],
    ['intermediate', null, 3],
    ['advanced', null, 4],
  ] as const;
  expect(cases.map(([level, est]) => bandForProfile(level, est))).toEqual(cases.map((c) => c[2]));
});

test('deckBand is the doc function, word for word', () => {
  expect(deckBand('a0', 4000)).toBe(0);
  expect(deckBand('a2', null)).toBe(2);
  expect(deckBand('unknown', null)).toBe(2);
  expect(deckBand('b2', 499)).toBe(1);
});
