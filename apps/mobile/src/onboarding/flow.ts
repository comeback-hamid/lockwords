import type { Profile } from '@/api/client';

import type { Answers, LanguageChoice } from './store';

export const TOTAL_STEPS = 10;

type Screen = 'learning' | 'speaks' | 'level' | 'word-test' | 'estimate' | 'goal' | 'interests';
const STEP: Record<Screen, number> = { learning: 1, speaks: 1, level: 2, 'word-test': 3, estimate: 6, goal: 7, interests: 8 };

// The n in "n/10" (Figma Top bar).
// Word test pages A, B, C take steps 3–5. The rare EXPERT page (D) keeps step 5, so later steps do not move.
export const stepFor = (screen: Screen, page = 0) => STEP[screen] + (screen === 'word-test' ? Math.min(page, 2) : 0);

// A learner who has not finished onboarding starts on O0 Hello (Kai says welcome), then O1.
export const startRoute = (finished: boolean) => (finished ? '/(tabs)' : '/onboarding/hello');

// "Brand new" has no words to test.
export const afterLevel = (level: Profile['level']) => (level === 'brand_new' ? '/onboarding/goal' : '/onboarding/word-test?page=A');

// What the server gets for a language: the code for a listed one, the typed text for Other.
export const languageValue = (choice: LanguageChoice) => choice.code ?? choice.name.trim();

export function profileBody(a: Answers): Profile {
  if (!a.learning || !a.speaks || !a.level || !a.goal) throw new Error('onboarding answers are missing');
  return {
    learningLanguage: languageValue(a.learning),
    nativeLanguage: languageValue(a.speaks),
    level: a.level,
    knownWords: a.estimate?.words ?? null,
    cefr: a.estimate?.cefr ?? null,
    goal: a.goal,
    goalOther: a.goal === 'other' ? a.goalOther.trim() || null : null,
    interests: a.interests,
  };
}
