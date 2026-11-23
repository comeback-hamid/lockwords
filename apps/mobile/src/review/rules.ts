import { useSyncExternalStore } from 'react';

import { api } from '@/auth/boot';

// The server's review numbers the card shows before a swipe is saved: days until an Easy card comes back, by stage.
// Loaded once per app start. Until then (or with no connection) the Easy label has no line under it.
let easyDays: number[] | null = null;
let loading: Promise<void> | null = null;
const listeners = new Set<() => void>();

export function loadReviewRules(): Promise<void> {
  if (easyDays) return Promise.resolve();
  loading ??= (async () => {
    try {
      easyDays = (await api.fetchReviewRules()).easyBackInDays;
      listeners.forEach((l) => l());
    } catch {
      // Tried again the next time a round opens.
    } finally {
      loading = null;
    }
  })();
  return loading;
}

export function resetReviewRules() {
  easyDays = null;
  loading = null;
}

const get = () => easyDays;
export function useEasyDays(): number[] | null {
  return useSyncExternalStore((l) => (listeners.add(l), () => listeners.delete(l)), get, get);
}
