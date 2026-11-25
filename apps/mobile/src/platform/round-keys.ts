import { useEffect, useRef } from 'react';
import { Platform } from 'react-native';

// The review card with a real keyboard (the web app). The phone has no keys, so the hook does nothing there.
export type RoundAction = 'flip' | 'hard' | 'known' | 'easy' | 'undo';
type Pressed = { key: string; metaKey?: boolean; ctrlKey?: boolean; altKey?: boolean; targetTag?: string; targetRole?: string | null };

const KEYS: Record<string, RoundAction> = { ' ': 'flip', Enter: 'flip', ArrowLeft: 'hard', ArrowUp: 'known', ArrowRight: 'easy', Backspace: 'undo', z: 'undo', Z: 'undo' };

// Which action a key means, or null. Keys with Ctrl, Alt or Cmd belong to the browser; keys typed into a text box
// belong to the text; Space and Enter on a focused button press that button.
export function roundKey(e: Pressed): RoundAction | null {
  if (e.metaKey || e.ctrlKey || e.altKey) return null;
  if (e.targetTag === 'INPUT' || e.targetTag === 'TEXTAREA') return null;
  const action = KEYS[e.key] ?? null;
  if (action === 'flip' && e.targetRole === 'button') return null;
  return action;
}

// The round is on screen: its top card is drawn and not hidden under another screen (Use it, a deck page).
// A screen under another one is kept in the page with `display: none`, so its card has no `offsetParent`.
const roundShown = () => [...document.querySelectorAll<HTMLElement>('[data-testid="review-card"]')].some((card) => card.offsetParent !== null);

// Listens for the keys while the screen that calls it is mounted. `onAction` may change on every render: the newest
// one is called.
export function useRoundKeys(onAction: (action: RoundAction) => void) {
  const latest = useRef(onAction);
  useEffect(() => {
    latest.current = onAction;
  });
  useEffect(() => {
    if (Platform.OS !== 'web' || typeof window === 'undefined') return;
    const onKey = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      const action = roundKey({ key: e.key, metaKey: e.metaKey, ctrlKey: e.ctrlKey, altKey: e.altKey, targetTag: target?.tagName, targetRole: target?.getAttribute?.('role') ?? (target?.tagName === 'BUTTON' ? 'button' : null) });
      if (!action || !roundShown()) return;
      e.preventDefault(); // Space and the arrows would scroll the page
      latest.current(action);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);
}
