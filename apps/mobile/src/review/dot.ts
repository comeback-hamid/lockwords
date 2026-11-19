import * as SecureStore from 'expo-secure-store';
import { useSyncExternalStore } from 'react';

// The red dot on the Review tab: new words are waiting. Set when a word or deck is added, cleared when Review opens.
// Kept on the phone so it survives a restart.
const KEY = 'lockwords.reviewDot'; // listed in SECURE_KEYS, so a fresh install clears it

let on = false;
const listeners = new Set<() => void>();
function set(next: boolean) {
  if (on === next) return;
  on = next;
  listeners.forEach((l) => l());
}

// Read once at app start (root layout).
export async function loadReviewDot() {
  set((await SecureStore.getItemAsync(KEY).catch(() => null)) === '1');
}
export async function showReviewDot() {
  set(true);
  await SecureStore.setItemAsync(KEY, '1').catch(() => {});
}
export async function clearReviewDot() {
  set(false);
  await SecureStore.deleteItemAsync(KEY).catch(() => {});
}
export function useReviewDot() {
  return useSyncExternalStore(
    (l) => {
      listeners.add(l);
      return () => void listeners.delete(l);
    },
    () => on,
  );
}
