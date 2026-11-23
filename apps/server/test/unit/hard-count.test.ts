import { expect, test } from 'vitest';

import { hardCount } from '../../src/progress/numbers.js';

const w = (stage: number, hard = false, known = false) => ({ stage, hard, known });

test('hard words: every hard word that is not marked "I know it"', () => {
  expect(hardCount([w(1, true), w(2, true), w(0), w(3), w(1, true, true)])).toBe(2);
  expect(hardCount([])).toBe(0);
});
