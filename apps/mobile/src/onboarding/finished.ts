import * as SecureStore from 'expo-secure-store';
import { useSyncExternalStore } from 'react';

const KEY = 'lockwords.onboarded'; // listed in SECURE_KEYS, so a fresh install clears it

// null = not read yet.
let finished: boolean | null = null;
const listeners = new Set<() => void>();
const set = (next: boolean) => {
  finished = next;
  listeners.forEach((l) => l());
};

export async function loadOnboardingFinished() {
  try {
    set((await SecureStore.getItemAsync(KEY)) === '1');
  } catch {
    set(false);
  }
}
export async function markOnboardingFinished() {
  await SecureStore.setItemAsync(KEY, '1');
  set(true);
}
export function useOnboardingFinished() {
  return useSyncExternalStore((l) => (listeners.add(l), () => listeners.delete(l)), () => finished, () => finished);
}
