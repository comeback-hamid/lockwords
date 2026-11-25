import { useSyncExternalStore } from 'react';
import { AppState, Platform } from 'react-native';

import { api } from '@/auth/boot';
import { getMe } from '@/auth/me-store';

import * as kaiPictures from './kai-files';
import widget from './lockwords-widget';
import { savePictures } from './pictures';
import { toTimeline, type KaiFiles } from './timeline';

const NO_KAI: KaiFiles = { greeting: '', idle: '', thinking: '', speaking: '', celebrate: '' };

// Hands the server's plan to the widget. The widget cannot ask the server itself, so this runs when the app
// starts, when it comes back to the front, and after a review round. It never throws and never shows an error:
// with no connection the widget keeps what it had.
export async function syncWidget(now = new Date()): Promise<void> {
  if (Platform.OS !== 'ios' || !getMe()) return; // the widget is iOS only
  try {
    const plan = await api.fetchWidgetPlan();
    // Without Kai's pictures the words still go to the widget.
    const kai = await kaiPictures.kaiFiles().catch(() => NO_KAI);
    // The home screen widgets: Kai in color and the word pictures. Without them the words still go out.
    const [color, pictures] = await Promise.all([
      Promise.resolve().then(() => kaiPictures.kaiColorFiles()).catch(() => undefined),
      Promise.resolve().then(() => savePictures(plan.slots)).catch(() => ({})),
    ]);
    const entries = toTimeline(plan, now, kai, { color, pictures });
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
