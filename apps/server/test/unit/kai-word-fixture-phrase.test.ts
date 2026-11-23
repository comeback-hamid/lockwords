import { expect, test } from 'vitest';

import { fixtureWordAnswer } from '../../src/kai/abilities/words.js';

// The stand-in AI gives one long phrase, so the review card's long-phrase layout can be shown and filmed.
test('a question about "the bill" gets a long phrase card; any other word question keeps the usual card', () => {
  expect(fixtureWordAnswer('How do I say can I have the bill?')?.word.word).toBe('¿Me puede traer la cuenta, por favor?');
  expect(fixtureWordAnswer('How do I say umbrella?')?.word.word).toBe('para llevar');
  expect(fixtureWordAnswer('I like billiards')).toBeNull();
});
