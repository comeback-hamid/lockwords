import { lostAnswers } from '@/platform/onboarding-reload';

// A browser reload in the middle of onboarding (found 2026-11-25). The answers live in memory, so a reload loses
// them while the address still names a later screen: Kai then said "I'll help you learn  words" with no language.
// The rule is the phone's: a restart starts onboarding again, from Hello.
test('a later onboarding screen with no answers must start over', () => {
  expect(lostAnswers('/onboarding/speaks', false)).toBe(true);
  expect(lostAnswers('/onboarding/word-test', false)).toBe(true);
  expect(lostAnswers('/onboarding/kai', false)).toBe(true);
});

test('the first two screens need no answers; a screen with answers stays', () => {
  expect(lostAnswers('/onboarding/hello', false)).toBe(false);
  expect(lostAnswers('/onboarding/learning', false)).toBe(false);
  expect(lostAnswers('/onboarding/kai', true)).toBe(false);
  expect(lostAnswers('/onboarding/speaks', true)).toBe(false);
});

test('an address outside onboarding is never touched', () => {
  expect(lostAnswers('/review', false)).toBe(false);
  expect(lostAnswers('/', false)).toBe(false);
});

test('where a reload with lost answers goes: the app for a learner who finished onboarding, Hello for a new one', () => {
  const { restartRoute } = jest.requireActual<typeof import('@/platform/onboarding-reload')>('@/platform/onboarding-reload');
  expect(restartRoute(true)).toBe('/');
  expect(restartRoute(false)).toBe('/onboarding/hello');
  expect(restartRoute(null)).toBe('/onboarding/hello');
});
