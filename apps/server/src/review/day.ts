// The review day (docs/product.md 7.5): a day starts at 04:00 on the learner's clock, so a late-night round still
// counts for "today". Pure: `now` and the time zone are passed in.
export type ReviewDay = { day: string; end: Date }; // day = "YYYY-MM-DD"; end = when this review day is over

const START_HOUR = 4;
const HOUR_MS = 3_600_000;

// Minutes the zone is ahead of UTC at that moment.
function offsetMinutes(at: Date, timeZone: string): number {
  const parts = new Intl.DateTimeFormat('en-US', { timeZone, hourCycle: 'h23', year: 'numeric', month: 'numeric', day: 'numeric', hour: 'numeric', minute: 'numeric', second: 'numeric' }).formatToParts(at);
  const n = (type: string) => Number(parts.find((p) => p.type === type)!.value);
  const local = Date.UTC(n('year'), n('month') - 1, n('day'), n('hour'), n('minute'), n('second'));
  return Math.round((local - at.getTime()) / 60_000);
}

function validZone(timeZone: string | undefined): string {
  if (!timeZone) return 'UTC';
  try {
    new Intl.DateTimeFormat('en-US', { timeZone });
    return timeZone;
  } catch {
    return 'UTC'; // an unknown zone: count in UTC
  }
}

export function reviewDay(now: Date, timeZone?: string): ReviewDay {
  const zone = validZone(timeZone);
  // The local wall clock, moved back 4 hours, as if it were UTC: its date is the review day.
  const shifted = new Date(now.getTime() + offsetMinutes(now, zone) * 60_000 - START_HOUR * HOUR_MS);
  const day = shifted.toISOString().slice(0, 10);
  // 04:00 local on the next date. The offset is read at the guess, so a clock change on that night is right too.
  const wallEnd = Date.UTC(shifted.getUTCFullYear(), shifted.getUTCMonth(), shifted.getUTCDate() + 1, START_HOUR);
  const guess = new Date(wallEnd - offsetMinutes(now, zone) * 60_000);
  return { day, end: new Date(wallEnd - offsetMinutes(guess, zone) * 60_000) };
}
