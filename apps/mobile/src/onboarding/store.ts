import { useSyncExternalStore } from 'react';

import type { Estimate, Profile, WordTest } from '@/api/client';

// code = a listed language ("es"); null = typed in the Other box.
export type LanguageChoice = { code: string | null; name: string };

export type Answers = {
  learning: LanguageChoice | null;
  speaks: LanguageChoice | null;
  level: Profile['level'] | null;
  wordTest: WordTest | null;
  known: [string[], string[], string[]]; // tapped words per band
  estimate: Estimate | null;
  goal: Profile['goal'] | null;
  goalOther: string;
  interests: Profile['interests'];
};

const empty = (): Answers => ({
  learning: null, speaks: null, level: null, wordTest: null, known: [[], [], []], estimate: null, goal: null, goalOther: '', interests: [],
});

// Onboarding answers live in memory until O9 saves them. A restart starts onboarding again.
let answers = empty();
const listeners = new Set<() => void>();
const emit = () => listeners.forEach((l) => l());

export const getAnswers = () => answers;
export function setAnswers(patch: Partial<Answers>) {
  answers = { ...answers, ...patch };
  emit();
}
export function resetAnswers() {
  answers = empty();
  emit();
}
export function useAnswers() {
  return useSyncExternalStore((l) => (listeners.add(l), () => listeners.delete(l)), getAnswers, getAnswers);
}
