import { useCallback, useEffect, useState } from 'react';

// Kai types: every Kai bubble waits behind a dots bubble for about a second, one bubble after another.
// Every chat screen uses this hook, so every chat types the same way.
const MIN_MS = 800;
const MAX_MS = 1200;
const MS_PER_CHAR = 8;

// 0.8 s for a short line, a little longer for a long one, never more than 1.2 s. **Stars** are not typed.
export const typingMs = (text: string) => Math.min(MAX_MS, MIN_MS + MS_PER_CHAR * text.replace(/\*\*/g, '').length);

// Jest turns typing off (jest.setup.tsx) so screen tests read Kai's lines at once; typing tests turn it on.
let typingOn = true;
export const setTypingForTests = (on: boolean) => {
  typingOn = on;
};

type Chat<M> = { shown: M[]; queue: M[] };

/**
 * `typedText(m)` returns the text Kai types for a message, or null for anything shown at once
 * (the user's bubbles, cards, status lines like "Checking… 👀").
 */
export function useKaiTyping<M>(typedText: (m: M) => string | null, initial: () => M[] = () => []) {
  const [chat, setChat] = useState<Chat<M>>(() => (typingOn ? { shown: [], queue: initial() } : { shown: initial(), queue: [] }));
  const head = chat.queue[0];
  const headText = head === undefined ? null : typedText(head);

  useEffect(() => {
    if (head === undefined) return;
    const t = setTimeout(
      () => setChat((c) => (c.queue[0] === head ? { shown: [...c.shown, head], queue: c.queue.slice(1) } : c)),
      headText == null ? 0 : typingMs(headText),
    );
    return () => clearTimeout(t);
  }, [head, headText]);

  // Add messages. With nothing waiting, the user's bubbles and other instant items show at once.
  const say = useCallback(
    (...items: M[]) =>
      setChat((c) => {
        if (!typingOn) return { shown: [...c.shown, ...items], queue: c.queue };
        const shown = [...c.shown];
        const queue = [...c.queue];
        for (const m of items) {
          if (queue.length === 0 && typedText(m) == null) shown.push(m);
          else queue.push(m);
        }
        return { shown, queue };
      }),
    [typedText],
  );

  // Change what is already on screen (for example, take a status line away).
  const edit = useCallback((change: (shown: M[]) => M[]) => setChat((c) => ({ ...c, shown: change(c.shown) })), []);

  return {
    messages: chat.shown,
    /** Kai is typing the next bubble: show the dots. */
    typing: headText != null,
    /** Messages are still waiting: reply options wait too. */
    busy: chat.queue.length > 0,
    say,
    edit,
  };
}
