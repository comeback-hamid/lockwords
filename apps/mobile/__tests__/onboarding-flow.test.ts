import { afterLevel, profileBody, startRoute, stepFor } from '@/onboarding/flow';
import { getAnswers, resetAnswers, setAnswers } from '@/onboarding/store';

beforeEach(resetAnswers);

test('step numbers match Figma (n/10)', () => {
  expect(stepFor('learning')).toBe(1);
  expect(stepFor('speaks')).toBe(1);
  expect(stepFor('level')).toBe(2);
  expect([0, 1, 2, 3].map((page) => stepFor('word-test', page))).toEqual([3, 4, 5, 5]);
  expect(stepFor('estimate')).toBe(6);
  expect(stepFor('goal')).toBe(7);
  expect(stepFor('interests')).toBe(8);
});

test('Brand new skips the word test', () => {
  expect(afterLevel('brand_new')).toBe('/onboarding/goal');
  expect(afterLevel('some_basics')).toBe('/onboarding/word-test?page=A');
});

test('start rule: onboarding until finished, then tabs', () => {
  expect(startRoute(false)).toBe('/onboarding/hello'); // O0 Hello comes before the first question (2026-11-23)
  expect(startRoute(true)).toBe('/(tabs)');
});

test('answers are kept and can be reset', () => {
  setAnswers({ learning: { code: 'es', name: 'Spanish' } });
  setAnswers({ level: 'beginner' });
  expect(getAnswers().learning).toEqual({ code: 'es', name: 'Spanish' });
  expect(getAnswers().level).toBe('beginner');
  resetAnswers();
  expect(getAnswers().learning).toBeNull();
});

test('profile body: listed languages send the code, typed ones send the text', () => {
  setAnswers({
    learning: { code: null, name: ' Swedish ' },
    speaks: { code: 'en', name: 'English' },
    level: 'some_basics',
    estimate: { words: 1850, outOf: 5000, plus: false, cefr: 'A2', startingFresh: false, reliable: true, fakesTicked: 0 },
    goal: 'other',
    goalOther: ' For my grandmother ',
    interests: ['food', 'music'],
  });
  expect(profileBody(getAnswers())).toEqual({
    learningLanguage: 'Swedish',
    nativeLanguage: 'en',
    level: 'some_basics',
    knownWords: 1850,
    cefr: 'A2',
    goal: 'other',
    goalOther: 'For my grandmother',
    interests: ['food', 'music'],
  });
});

test('profile body: no estimate and a listed goal send nulls', () => {
  setAnswers({ learning: { code: 'es', name: 'Spanish' }, speaks: { code: 'fa', name: 'Persian' }, level: 'brand_new', goal: 'travel', goalOther: 'left over text', interests: ['news'] });
  expect(profileBody(getAnswers())).toMatchObject({ knownWords: null, cefr: null, goal: 'travel', goalOther: null });
});
