import type { Profile } from '@/api/client';

import type { Answers, LanguageChoice } from './store';

export const TOTAL_STEPS = 10;

type Screen = 'learning' | 'speaks' | 'level' | 'word-test' | 'estimate' | 'goal' | 'interests';
const STEP: Record<Screen, number> = { learning: 1, speaks: 1, level: 2, 'word-test': 3, estimate: 6, goal: 7, interests: 8 };

// The n in "n/10" (Figma Top bar).
export const stepFor = (screen: Screen, band = 0) => STEP[screen] + (screen === 'word-test' ? band : 0);

export const startRoute = (finished: boolean) => (finished ? '/(tabs)' : '/onboarding/learning');

// "Brand new" has no words to test.
export const afterLevel = (level: Profile['level']) => (level === 'brand_new' ? '/onboarding/goal' : '/onboarding/word-test?band=0');

// What the server gets for a language: the code for a listed one, the typed text for Other.
export const languageValue = (choice: LanguageChoice) => choice.code ?? choice.name.trim();

export function profileBody(a: Answers): Profile {
  if (!a.learning || !a.speaks || !a.level || !a.goal) throw new Error('onboarding answers are missing');
  return {
    learningLanguage: languageValue(a.learning),
    nativeLanguage: languageValue(a.speaks),
    level: a.level,
    knownWords: a.estimate?.knownWords ?? null,
    cefr: a.estimate?.cefr ?? null,
    goal: a.goal,
    goalOther: a.goal === 'other' ? a.goalOther.trim() || null : null,
    interests: a.interests,
  };
}
