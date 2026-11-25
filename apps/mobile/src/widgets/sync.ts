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
    widget.updateTimeline(toTimeline(plan, now, await kaiFiles()));
  } catch {
    // The widget keeps its last timeline.
  }
}

// Called once from the root layout, after the session is there.
export function startWidgetSync(): () => void {
  void syncWidget();
  const sub = AppState.addEventListener('change', (state) => {
    if (state === 'active') void syncWidget();
  });
  return () => sub.remove();
}
