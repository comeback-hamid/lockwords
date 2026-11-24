import { backFromUseIt, leftForUseIt } from '@/review/round-store';

// Hamid's iPhone, 2026-11-24: closing Use it with the X sent the learner back to the start of Review.
// The Review tab loads a new round each time it comes into view; coming back from Use it is the one exception.
test('back from Use it is told once, then the tab loads again as usual', () => {
  expect(backFromUseIt()).toBe(false);
  leftForUseIt();
  expect(backFromUseIt()).toBe(true);
  expect(backFromUseIt()).toBe(false);
});
