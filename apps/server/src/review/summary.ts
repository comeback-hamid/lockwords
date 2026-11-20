// The numbers the Review screens show: the streak and what was done today. Pure: everything is passed in.
// A day here is a review day ("YYYY-MM-DD", see day.ts).

const DAY_MS = 86_400_000;
const MAX_GAP_MS = 60_000; // a longer pause between two swipes is a break, not review time

const dayBefore = (day: string) => new Date(Date.parse(`${day}T00:00:00Z`) - DAY_MS).toISOString().slice(0, 10);

// Review days in a row with at least one swipe, ending today, or yesterday when today has none yet.
export function streakDays(daysWithReviews: string[], today: string): number {
  const days = new Set(daysWithReviews);
  let day = days.has(today) ? today : dayBefore(today);
  let streak = 0;
  while (days.has(day)) {
    streak++;
    day = dayBefore(day);
  }
  return streak;
}

export type TodayEvent = { cardId: string; kind: 'easy' | 'hard' | 'known' | 'use_it'; at: Date; stage: number }; // stage = after the event
export type TodayNumbers = { words: number; minutes: number; easy: number; hard: number; known: number; stages: number[] };

// `events` are today's swipes that were not undone, oldest first.
export function todayNumbers(events: TodayEvent[]): TodayNumbers {
  const last = new Map<string, TodayEvent>(); // insertion order = the order the words were first seen
  for (const e of events) last.set(e.cardId, e);
  const finals = [...last.values()];
  let ms = 0;
  for (let i = 1; i < events.length; i++) ms += Math.min(events[i]!.at.getTime() - events[i - 1]!.at.getTime(), MAX_GAP_MS);
  return {
    words: finals.length,
    minutes: events.length ? Math.max(1, Math.ceil(ms / 60_000)) : 0,
    easy: finals.filter((e) => e.kind === 'easy' || e.kind === 'use_it').length, // a good sentence counts like Easy
    hard: finals.filter((e) => e.kind === 'hard').length,
    known: finals.filter((e) => e.kind === 'known').length,
    stages: finals.map((e) => e.stage),
  };
}
