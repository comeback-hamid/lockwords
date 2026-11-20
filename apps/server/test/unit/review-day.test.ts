import { expect, test } from 'vitest';

import { reviewDay } from '../../src/review/day.js';

const at = (iso: string, zone?: string) => reviewDay(new Date(iso), zone);

test('a review day starts at 04:00 local time', () => {
  // Europe/London in November is UTC.
  expect(at('2026-11-20T23:00:00Z', 'Europe/London').day).toBe('2026-11-20');
  expect(at('2026-11-21T02:00:00Z', 'Europe/London').day).toBe('2026-11-20'); // after midnight: still yesterday
  expect(at('2026-11-21T03:59:59Z', 'Europe/London').day).toBe('2026-11-20');
  expect(at('2026-11-21T04:00:00Z', 'Europe/London').day).toBe('2026-11-21');
});

test('the day follows the phone time zone', () => {
  // 01:00 UTC is 20:00 the day before in Toronto (UTC−5) and 04:30 in Tehran (UTC+3:30).
  expect(at('2026-11-21T01:00:00Z', 'America/Toronto').day).toBe('2026-11-20');
  expect(at('2026-11-21T01:00:00Z', 'Asia/Tehran').day).toBe('2026-11-21');
});

test('the day ends at 04:00 local time of the next date', () => {
  expect(at('2026-11-20T10:00:00Z', 'Europe/London').end.toISOString()).toBe('2026-11-21T04:00:00.000Z');
  expect(at('2026-11-20T10:00:00Z', 'America/Toronto').end.toISOString()).toBe('2026-11-21T09:00:00.000Z');
  expect(at('2026-11-21T02:00:00Z', 'Europe/London').end.toISOString()).toBe('2026-11-21T04:00:00.000Z');
});

test('a missing or unknown zone means UTC', () => {
  expect(at('2026-11-21T03:00:00Z').day).toBe('2026-11-20');
  expect(at('2026-11-21T03:00:00Z', 'Not/AZone').day).toBe('2026-11-20');
  expect(at('2026-11-21T05:00:00Z', '').end.toISOString()).toBe('2026-11-22T04:00:00.000Z');
});
