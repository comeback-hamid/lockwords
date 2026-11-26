import { requireOptionalNativeModule } from 'expo';

import type { TimelineEntry, WidgetProps } from './timeline';

// The Android home screen widget is our own native code (modules/lockwords-widget). This is the app's side of it.
type Native = { setEntries(json: string): void; shown(): string | null; count(): number };
const native = requireOptionalNativeModule<Native>('LockwordsWidget'); // null in Jest, on iOS and in a browser

// One thing the widget shows from a time on (the Kotlin side: Entry in WidgetPlan.kt). Kai's pose is not sent:
// the widget picks it from the look, with the same rule as iOS.
export type AndroidEntry = { at: number; kind: WidgetProps['kind']; word: string; meaning: string; look: number; url: string; example: string };

export const androidEntries = (entries: TimelineEntry[]): AndroidEntry[] =>
  entries.map(({ date, props }) => ({ at: date.getTime(), kind: props.kind, word: props.word, meaning: props.meaning, look: props.look, url: props.url, example: props.example ?? '' }));

// Hands the entries to the widget. It keeps them and draws itself again, also while the app is closed.
export function handToAndroidWidget(entries: TimelineEntry[]): void {
  native?.setEntries(JSON.stringify(androidEntries(entries)));
}

// What the widget itself says it shows right now (read back from the native side). Dev builds show its tap address
// on the Review tab, so a Maestro flow can check the whole way: app → stored plan → the widget's own pick.
export function androidWidgetShown(): { kind: string; word: string; meaning: string; look: number; url: string } | null {
  try {
    const json = native?.shown();
    return json ? JSON.parse(json) : null;
  } catch {
    return null;
  }
}
