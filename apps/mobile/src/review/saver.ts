import type { Direction, SwipeResult } from '@/api/client';
import { api } from '@/auth/boot';

// Swipes are saved in the background, one after another, in the order they were made (the server's Undo and
// "comes back today" rules depend on the order). A failed save is tried again before the card is given back.
const TRIES = 3;
const RETRY_MS = process.env.NODE_ENV === 'test' ? 0 : 700;
const TIMEOUT_MS = 10_000; // a save that hangs counts as failed, so it cannot block the swipes after it
const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

let queue: Promise<unknown> = Promise.resolve();

export function saveSwipe(cardId: string, direction: Direction): Promise<SwipeResult | null> {
  const job = queue.then(async () => {
    for (let attempt = 1; attempt <= TRIES; attempt += 1) {
      try {
        return await Promise.race([api.swipeCard(cardId, direction), wait(TIMEOUT_MS).then(() => Promise.reject(new Error('timeout')))]);
      } catch {
        if (attempt < TRIES) await wait(RETRY_MS * attempt);
      }
    }
    return null; // not saved
  });
  queue = job;
  return job;
}

// Resolves when every swipe made so far is saved (or given up on).
export const savesDone = (): Promise<unknown> => queue;

// Tests only: forget saves that are still open.
export function resetSaves() {
  queue = Promise.resolve();
}
