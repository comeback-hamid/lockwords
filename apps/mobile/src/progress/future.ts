import type { Progress } from '@/api/client';

// The future bar of the Progress tab (Hamid, 2026-11-25). The bar is the progress bar: it is filled up to today's
// words. The learner drags it forward to a stop, sees the forest, the day and the level of that stop, and lets go:
// everything goes back to today. Pure rules here; src/components/future-bar.tsx draws and moves it.
export type Stop = Progress['stops'][number];
const MARKS = [0, 100, 200, 500, 1000] as const; // equal steps on the bar, so the near stops are not squeezed

// Where a number of words sits on the bar, 0 (left) to 1 (right).
export function place(words: number): number {
  const last = MARKS.length - 1;
  if (words <= 0) return 0;
  if (words >= MARKS[last]!) return 1;
  const i = MARKS.findIndex((m, at) => at < last && words < MARKS[at + 1]!);
  return (i + (words - MARKS[i]!) / (MARKS[i + 1]! - MARKS[i]!)) / last;
}

// The stops the learner has not reached yet.
export const ahead = (total: number, stops: Stop[]) => stops.filter((s) => s.words > total);

// Which point the handle rests on for a finger at `at` (0 to 1): -1 = today, or the index of the nearest stop ahead.
// The finger cannot go behind today.
export function pointAt(at: number, total: number, stopsAhead: Stop[]): number {
  let best = -1;
  let distance = Math.abs(at - place(total));
  stopsAhead.forEach((s, i) => {
    const d = Math.abs(at - place(s.words));
    if (d < distance) {
      best = i;
      distance = d;
    }
  });
  return best;
}

const MONTHS = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'];
// "2027-07-02" → "ABOUT JUL 2" in this year, "ABOUT JUL 2027" in another year (a far day is only a guess).
export function aboutDate(day: string, thisYear: number): string {
  const month = MONTHS[Number(day.slice(5, 7)) - 1] ?? '';
  const year = Number(day.slice(0, 4));
  return year === thisYear ? `ABOUT ${month} ${Number(day.slice(8, 10))}` : `ABOUT ${month} ${year}`;
}

// What a learner can do at each level, in one plain sentence.
const CAN_DO: Record<string, string> = {
  A1: 'You can say hello, order food and ask simple questions.',
  A2: 'You can talk about your day, your work and your plans in simple words.',
  B1: 'You can follow most everyday talk and explain your opinion.',
  B2: 'You can join meetings, read the news and speak without searching for words.',
  C1: 'You can speak with ease about almost any topic, also at work.',
};
const NO_LEVEL = 'Every word you learn makes the next one easier.';
const thousands = (n: number) => String(n).replace(/\B(?=(\d{3})+(?!\d))/g, ',');
// The card under the bar: a small tag and one sentence. With no word test there is no level to show.
export function levelCard(words: number, level?: string, vocabulary?: number): { tag: string; line: string } {
  if (!level || vocabulary === undefined) return { tag: `${thousands(words)} ${words === 1 ? 'WORD' : 'WORDS'}`, line: NO_LEVEL };
  return { tag: `${level} · ABOUT ${thousands(Math.round(vocabulary / 100) * 100)} WORDS`, line: CAN_DO[level] ?? NO_LEVEL };
}
export const wordsText = thousands;

// Grey trees in today's meadow: the trees still to grow before the next stop (30 words a tree, two at most).
export const ghostTrees = (total: number, next: Stop | undefined) => (next ? Math.min(2, Math.ceil((next.words - total) / 30)) : 0);
