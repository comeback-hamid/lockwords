import { useSyncExternalStore } from 'react';
import { AppState } from 'react-native';

import { api } from '@/auth/boot';
import { getMe } from '@/auth/me-store';

import { androidWidgetShown, handToAndroidWidget } from './android-widget';
import { toTimeline, type KaiFiles } from './timeline';

// Android's copy of sync.ts: the same plan from the server, handed to the Android home screen widget
// (modules/lockwords-widget). Android has no lock screen widgets on phones.
// Kai's pictures are part of the widget itself there, so no files are copied.
const NO_KAI: KaiFiles = { greeting: '', idle: '', thinking: '', speaking: '', celebrate: '' };

// Runs when the app starts, when it comes back to the front, and after a review round. It never throws and never
// shows an error: with no connection the widget keeps what it had.
export async function syncWidget(now = new Date()): Promise<void> {
  if (!getMe()) return;
  try {
    const entries = toTimeline(await api.fetchWidgetPlan(), now, NO_KAI);
    handToAndroidWidget(entries);
    // The address comes back from the widget itself when it can say (the phone); else from the entries (tests).
    setShownUrl(androidWidgetShown()?.url ?? entries.findLast((e) => e.date.getTime() <= now.getTime())?.props.url ?? null);
  } catch {
    // The widget keeps its last entries.
  }
}

// Dev builds only: where a tap on the widget would go right now. The Maestro flow reads it.
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
