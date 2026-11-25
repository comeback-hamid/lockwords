import { useSyncExternalStore } from 'react';

// The word tapped on the widget. The widget opens `lockwords://review?first=<card id>`; the router shows the
// Review tab, and the tab takes the id from here once and starts the round with that word.
let id: string | null = null;
const listeners = new Set<() => void>();
const set = (next: string | null) => {
  id = next;
  listeners.forEach((l) => l());
};

// A tapped word is being loaded (by whichever copy of the Review tab took it). `opened` counts the taps that were
// taken, so a load of the usual round that started before a tap knows it lost.
let opening = false;
let opened = 0;
let ended = 0;

export const tapped = {
  isOpening: () => opening,
  opened: () => opened,
  startOpening: () => {
    opening = true;
    opened += 1;
  },
  // The tapped word is loaded, or could not be. Every copy of the Review tab hears it (useOpeningEnded).
  doneOpening: () => {
    opening = false;
    ended += 1;
    listeners.forEach((l) => l());
  },
  set: (cardId: string) => set(cardId),
  take: () => {
    const was = id;
    if (was !== null) set(null);
    return was;
  },
};

// Counts the tapped words that finished loading. A copy of the Review tab that shows no round after one of them
// (the word was removed, the load failed, or another copy took the tap) loads the usual start.
export function useOpeningEnded() {
  return useSyncExternalStore((l) => (listeners.add(l), () => listeners.delete(l)), () => ended, () => ended);
}

export function useTapped() {
  return useSyncExternalStore((l) => (listeners.add(l), () => listeners.delete(l)), () => id, () => id);
}

// "lockwords://review?first=<id>" → the id. Any other address → null.
export function firstFromUrl(url: string | null): string | null {
  const match = url ? /^[a-z]+:\/\/\/?review\/?\?(?:.*&)?first=([^&#]+)/i.exec(url) : null;
  if (!match) return null;
  try {
    return decodeURIComponent(match[1]!);
  } catch {
    return null; // a broken address
  }
}
