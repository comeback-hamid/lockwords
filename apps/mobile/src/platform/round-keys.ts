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

// The round is the screen on top. Two ways it is not: a screen pushed over it (Use it, a deck page) leaves it in the
// page with `display: none` (no `offsetParent`); another tab leaves it in the page, drawn, under the open tab's screen.
// So the test is what the page shows in the middle of the round: one of the round's own elements, or something else.
type RoundElement = { offsetParent: unknown; getBoundingClientRect(): { left: number; top: number; width: number; height: number }; contains(el: never): boolean };
type PageLike = { querySelectorAll(selector: string): Iterable<RoundElement>; elementFromPoint(x: number, y: number): unknown };
export const ROUND_TEST_ID = 'review-round';
export function roundOnTop(doc: PageLike): boolean {
  for (const round of doc.querySelectorAll(`[data-testid="${ROUND_TEST_ID}"]`)) {
    if (round.offsetParent === null) continue;
    const r = round.getBoundingClientRect();
    const top = doc.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2);
    if (top && round.contains(top as never)) return true;
  }
  return false;
}

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
      if (!action || !roundOnTop(document as unknown as PageLike)) return;
      e.preventDefault(); // Space and the arrows would scroll the page
      latest.current(action);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);
}
