import { useCallback, useState, type RefObject } from 'react';

import type { Deck, KaiTurnResult } from '@/api/client';
import { api } from '@/auth/boot';

// A deck's pictures are drawn after its words. The deck is in Review already; its card counts the pictures, and the
// learner chats with Kai while they wait. When the run ends, Kai says so as soon as the chat is quiet.
export type Drawing = { id: string; ready: number; total: number };
const QUIET_CHECK_MS = 300;
const QUIET_TRIES = 200; // one minute: after that Kai says nothing (the card is simply ready)

type Chat = {
  quietRef: RefObject<boolean>; // the screen's turn lock: false while Kai or the learner has the turn
  take(result: KaiTurnResult): boolean; // queues Kai's lines; false = nothing to show
  setBusy(busy: boolean): void;
};

export function useDeckPictures({ quietRef, take, setBusy }: Chat) {
  const [drawing, setDrawing] = useState<Drawing | null>(null);
  const draw = useCallback(
    async (deck: Deck | undefined) => {
      if (deck?.picturesStatus !== 'making') return; // no pictures coming (an older deck, or no image model)
      setDrawing({ id: deck.id, ready: deck.picturesReady ?? 0, total: deck.wordCount });
      try {
        await api.waitForPictures(deck.id, (ready) => setDrawing((d) => (d ? { ...d, ready } : d)));
      } catch {
        // The wait broke (no network): the deck is still made. Kai is asked below and may have nothing to say.
      }
      setDrawing(null);
      for (let i = 0; i < QUIET_TRIES && !quietRef.current; i++) await new Promise((resolve) => setTimeout(resolve, QUIET_CHECK_MS));
      if (!quietRef.current) return;
      quietRef.current = false;
      setBusy(true);
      const result = await api.deckPictures(deck.id);
      setBusy(false);
      if (!take(result)) quietRef.current = true;
    },
    [quietRef, take, setBusy],
  );
  return { drawing, draw };
}
