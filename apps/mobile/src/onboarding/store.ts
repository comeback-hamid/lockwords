import { useSyncExternalStore } from 'react';

import type { Estimate, Profile, TestAnswers, WordTest } from '@/api/client';

// code = a listed language ("es"); null = typed in the Other box.
export type LanguageChoice = { code: string | null; name: string };

export type Answers = {
  learning: LanguageChoice | null;
  speaks: LanguageChoice | null;
  level: Profile['level'] | null;
  wordTest: WordTest | null;
  known: TestAnswers; // tapped words per word test page (A, B, then C and D only when shown)
  estimate: Estimate | null;
  retried: boolean; // "Try again" was used once after guessing
  goal: Profile['goal'] | null;
  goalOther: string;
  interests: Profile['interests'];
};

const empty = (): Answers => ({
  learning: null, speaks: null, level: null, wordTest: null, known: { A: [], B: [] }, estimate: null, retried: false, goal: null, goalOther: '', interests: [],
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
