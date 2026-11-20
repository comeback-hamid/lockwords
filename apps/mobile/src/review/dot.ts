import * as SecureStore from '@/platform/key-store';
import { useEffect, useSyncExternalStore } from 'react';

// The red dot on the Review tab: new words are waiting (a deck was just made in the New words chat).
// Kept on the phone, so it is still there after a restart. It goes away when the learner opens Review.
// shortcut: a flag on the phone; a server-side "unseen" count can replace it when Review's own badge rules are designed.
export const REVIEW_DOT_KEY = 'lockwords.reviewDot'; // listed in SECURE_KEYS, so a fresh install clears it

let on = false;
let loaded = false;
let changes = 0; // a slow first read must not undo a newer change
const listeners = new Set<() => void>();
const set = (next: boolean) => {
  changes++;
  if (on === next) return;
  on = next;
  listeners.forEach((l) => l());
};

export async function loadReviewDot() {
  loaded = true;
  const before = changes;
  const saved = await SecureStore.getItemAsync(REVIEW_DOT_KEY).catch(() => null);
  if (changes === before) set(saved === '1');
}
export async function showReviewDot() {
  loaded = true;
  set(true);
  await SecureStore.setItemAsync(REVIEW_DOT_KEY, '1').catch(() => {});
}
export async function clearReviewDot() {
  loaded = true;
  set(false);
  await SecureStore.deleteItemAsync(REVIEW_DOT_KEY).catch(() => {});
}
export function useReviewDot() {
  useEffect(() => {
    if (!loaded) void loadReviewDot();
  }, []);
  return useSyncExternalStore((l) => (listeners.add(l), () => listeners.delete(l)), () => on, () => on);
}
