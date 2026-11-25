import { useSyncExternalStore } from 'react';

// The word tapped on the widget. The widget opens `lockwords://review?first=<card id>`; the router shows the
// Review tab, and the tab takes the id from here once and starts the round with that word.
let id: string | null = null;
const listeners = new Set<() => void>();
const set = (next: string | null) => {
  id = next;
  listeners.forEach((l) => l());
};

export const tapped = {
  set: (cardId: string) => set(cardId),
  take: () => {
    const was = id;
    if (was !== null) set(null);
    return was;
  },
};

export function useTapped() {
  return useSyncExternalStore((l) => (listeners.add(l), () => listeners.delete(l)), () => id, () => id);
}

// "lockwords://review?first=<id>" → the id. Any other address → null.
export function firstFromUrl(url: string | null): string | null {
  const match = url ? /^[a-z]+:\/\/\/?review\/?\?(?:.*&)?first=([^&#]+)/i.exec(url) : null;
  return match ? decodeURIComponent(match[1]!) : null;
}
