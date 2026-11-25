import type { WidgetPlan } from '@/api/client';

// What one widget entry shows. The widget's own code can read nothing else (no network, no storage).
export type WidgetProps = {
  kind: 'word' | 'empty' | 'stale'; // a hard word · no hard words · the plan ran out (the app was not opened for 2 days)
  word: string;
  meaning: string;
  look: number; // 1 to 5 for a word, 0 for the other kinds: how many of the five squares are filled
  kai: string; // the file of Kai's pose for this look, in the folder shared with the widget; '' = no Kai (long text)
  url: string; // where a tap goes
};
export type KaiPose = 'greeting' | 'idle' | 'thinking' | 'speaking' | 'celebrate';
export type KaiFiles = Record<KaiPose, string>;
export type TimelineEntry = { date: Date; props: WidgetProps };

// Kai cannot move in a widget, so it gets a new still pose with every look: waves, rests, thinks, speaks, cheers.
const POSES: KaiPose[] = ['greeting', 'idle', 'thinking', 'speaking', 'celebrate'];
export const poseOf = (look: number): KaiPose => POSES[look - 1] ?? 'idle';

const REVIEW = 'lockwords://review';

// The lock screen widget is 160 points wide. Next to Kai, about 12 letters of the word and 14 of the meaning fit at
// full size. Longer text gets the whole width and Kai is left out (Hamid, 2026-11-25).
const WORD_FITS = 12;
const MEANING_FITS = 14;
export const roomForKai = (word: string, meaning: string) => [...word].length <= WORD_FITS && [...meaning].length <= MEANING_FITS;

// The server's plan as the widget's timeline. The server decided the words, the order and the looks.
export function toTimeline(plan: WidgetPlan, now: Date, kai: KaiFiles): TimelineEntry[] {
  if (plan.slots.length === 0 || !plan.endsAt) return [{ date: now, props: { kind: 'empty', word: 'No hard words', meaning: 'Swipe left in Review', look: 0, kai: kai.idle, url: REVIEW } }];
  const entries: TimelineEntry[] = plan.slots.map((s) => ({
    date: new Date(s.at),
    props: { kind: 'word', word: s.word, meaning: s.translation, look: s.look, kai: roomForKai(s.word, s.translation) ? kai[poseOf(s.look)] : '', url: `${REVIEW}?first=${s.cardId}` },
  }));
  // At night no slot runs: the next word shows already, so the widget is never blank.
  if (entries[0]!.date.getTime() > now.getTime()) entries.unshift({ date: now, props: entries[0]!.props });
  entries.push({ date: new Date(plan.endsAt), props: { kind: 'stale', word: 'Open Lockwords', meaning: 'for your hard words', look: 0, kai: kai.greeting, url: REVIEW } });
  return entries;
}
