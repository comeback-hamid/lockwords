import { useSyncExternalStore } from 'react';
import { AppState } from 'react-native';

import { api } from '@/auth/boot';
import { getMe } from '@/auth/me-store';

import { kaiFiles } from './kai-files';
import widget from './lockwords-widget';
import { toTimeline } from './timeline';

// Hands the server's plan to the widget. The widget cannot ask the server itself, so this runs when the app
// starts, when it comes back to the front, and after a review round. It never throws and never shows an error:
// with no connection the widget keeps what it had.
export async function syncWidget(now = new Date()): Promise<void> {
  if (!getMe()) return;
  try {
    const plan = await api.fetchWidgetPlan();
    const entries = toTimeline(plan, now, await kaiFiles());
    widget.updateTimeline(entries);
    setShownUrl(entries.findLast((e) => e.date.getTime() <= now.getTime())?.props.url ?? null);
  } catch {
    // The widget keeps its last timeline.
  }
}

// Dev builds only: where a tap on the widget would go right now. The Maestro flow reads it, because it cannot tap a
// widget on the lock screen.
let shownUrl: string | null = null;
const urlListeners = new Set<() => void>();
function setShownUrl(url: string | null) {
  shownUrl = url;
  urlListeners.forEach((l) => l());
}
export function useWidgetUrl() {
  return useSyncExternalStore((l) => (urlListeners.add(l), () => urlListeners.delete(l)), () => shownUrl, () => shownUrl);
}

// Called once from the root layout, after the session is there.
export function startWidgetSync(): () => void {
  void syncWidget();
  const sub = AppState.addEventListener('change', (state) => {
    if (state === 'active') void syncWidget();
  });
  return () => sub.remove();
}
