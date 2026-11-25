import { beforeAll, beforeEach, expect, test } from 'vitest';

import { createApp, type CardsStore, type UsersStore, type WidgetStore } from '../../src/app.js';
import { countPassed, emptyState, makePlan, slotTimes, type HardWord, type WidgetState } from '../../src/widget/plan.js';
import { ISSUER, makeTestKeys } from '../helpers/tokens.js';

const ZONE = 'Europe/London'; // November: the same as UTC
const at = (iso: string) => new Date(iso);
const word = (n: number, looks = 0): HardWord => ({ cardId: `c${n}`, word: `w${n}`, translation: `t${n}`, createdAt: at(`2026-11-0${n}T00:00:00Z`), looks });
const ids = (slots: { cardId: string }[]) => slots.map((s) => s.cardId);

test('a slot is 30 minutes, on the half hour, for the next 48 hours', () => {
  const times = slotTimes(at('2026-11-25T09:10:00Z'), ZONE);
  expect(times[0]).toEqual({ at: at('2026-11-25T09:00:00Z'), end: at('2026-11-25T09:30:00Z') });
  expect(times[1]!.at).toEqual(at('2026-11-25T09:30:00Z'));
  expect(times.at(-1)!.at.getTime()).toBeLessThan(at('2026-11-27T09:10:00Z').getTime());
  expect(times.every((t) => t.end.getTime() - t.at.getTime() === 30 * 60_000)).toBe(true);
});

test('slots exist only from 07:00 to 23:00 on the learner’s clock', () => {
  const times = slotTimes(at('2026-11-25T22:50:00Z'), ZONE);
  expect(times[0]!.at).toEqual(at('2026-11-25T22:30:00Z'));
  expect(times[1]!.at).toEqual(at('2026-11-26T07:00:00Z')); // the night has no slots
  // Tehran is 3.5 hours ahead: 07:00 there is 03:30 UTC.
  expect(slotTimes(at('2026-11-25T00:00:00Z'), 'Asia/Tehran')[0]!.at).toEqual(at('2026-11-25T03:30:00Z'));
  expect(slotTimes(at('2026-11-25T02:00:00Z'), 'Not/AZone')[0]!.at).toEqual(at('2026-11-25T07:00:00Z')); // unknown zone: UTC
});

test('hard words take turns in a group of 6; the 7th comes in right after one had its 5th look', () => {
  const plan = makePlan([1, 2, 3, 4, 5, 6, 7, 8].map((n) => word(n)), at('2026-11-25T07:00:00Z'), ZONE);
  expect(ids(plan.slots.slice(0, 12))).toEqual(['c1', 'c2', 'c3', 'c4', 'c5', 'c6', 'c1', 'c2', 'c3', 'c4', 'c5', 'c6']);
  expect(plan.slots.slice(0, 12).map((s) => s.look)).toEqual([1, 1, 1, 1, 1, 1, 2, 2, 2, 2, 2, 2]);
  expect(plan.slots[24]).toMatchObject({ cardId: 'c1', look: 5 });
  expect(plan.slots[25]).toMatchObject({ cardId: 'c7', look: 1 });
  expect(ids(plan.slots.slice(0, 25))).not.toContain('c7');
});

test('fewest looks first, then the oldest card', () => {
  const plan = makePlan([word(1, 3), word(3, 0), word(2, 0)], at('2026-11-25T07:00:00Z'), ZONE);
  expect(plan.slots.slice(0, 3)).toMatchObject([{ cardId: 'c2', look: 1 }, { cardId: 'c3', look: 1 }, { cardId: 'c1', look: 4 }]);
});

test('one word: looks 1 to 5, then a new lap starts at 1', () => {
  const plan = makePlan([word(1)], at('2026-11-25T07:00:00Z'), ZONE);
  expect(plan.slots.slice(0, 7).map((s) => s.look)).toEqual([1, 2, 3, 4, 5, 1, 2]);
  expect(plan.slots[5]!.newLap).toBe(true);
  expect(plan.slots[0]!.newLap).toBeUndefined();
  expect(plan.endsAt).toEqual(plan.slots.at(-1)!.end);
});

test('every word has 5 looks: a new lap from 0 for all', () => {
  const plan = makePlan([word(1, 5), word(2, 5)], at('2026-11-25T07:00:00Z'), ZONE);
  expect(plan.slots.slice(0, 2)).toMatchObject([{ cardId: 'c1', look: 1, newLap: true }, { cardId: 'c2', look: 1 }]);
});

test('no hard words: no slots', () => {
  expect(makePlan([], at('2026-11-25T07:00:00Z'), ZONE)).toEqual({ slots: [], endsAt: null });
});

test('a passed slot counts one look, once', () => {
  const state: WidgetState = {
    slots: [
      { at: at('2026-11-25T09:00:00Z'), end: at('2026-11-25T09:30:00Z'), cardId: 'c1' },
      { at: at('2026-11-25T09:30:00Z'), end: at('2026-11-25T10:00:00Z'), cardId: 'c2' },
    ],
    looks: { c1: 1 },
    countedUntil: at('2026-11-25T09:00:00Z'),
  };
  const first = countPassed(state, at('2026-11-25T09:40:00Z'));
  expect(first.looks).toEqual({ c1: 2 }); // c2's slot is not over yet
  const second = countPassed(first, at('2026-11-25T09:45:00Z'));
  expect(second.looks).toEqual({ c1: 2 });
  expect(countPassed(second, at('2026-11-25T10:00:00Z')).looks).toEqual({ c1: 2, c2: 1 });
});

test('a passed slot that starts a new lap sets every word back to 0 first', () => {
  const state: WidgetState = { slots: [{ at: at('2026-11-25T09:00:00Z'), end: at('2026-11-25T09:30:00Z'), cardId: 'c1', newLap: true }], looks: { c1: 5, c2: 5 }, countedUntil: at('2026-11-25T08:00:00Z') };
  expect(countPassed(state, at('2026-11-25T09:30:00Z')).looks).toEqual({ c1: 1 });
});

// The route, with stores kept in memory.
let t: Awaited<ReturnType<typeof makeTestKeys>>;
let now: Date;
let hard: { id: string; word: string; translation: string; createdAt: Date }[];
let kept: WidgetState | null;
let call: (path: string, method?: string, body?: unknown, auth?: boolean) => Promise<Response>;
type Plan = { slots: { at: string; cardId: string; word: string; translation: string; look: number }[]; endsAt: string | null };
const plan = async () => (await (await call('/v1/widget/plan')).json()) as Plan;
const users: UsersStore = { upsert: async (id, isGuest) => ({ id, isGuest, createdAt: new Date() }) };

beforeAll(async () => {
  t = await makeTestKeys();
});
beforeEach(async () => {
  now = at('2026-11-25T09:00:00Z');
  hard = [1, 2].map((n) => ({ id: `c${n}`, word: `w${n}`, translation: `t${n}`, createdAt: at(`2026-11-0${n}T00:00:00Z`) }));
  kept = null;
  const cards = { widgetWords: async () => hard } as unknown as CardsStore;
  const widget: WidgetStore = { get: async () => kept, save: async (_userId, state) => void (kept = state) };
  const app = createApp({ keys: t.keys, issuer: ISSUER, users, cards, widget, reviewNow: () => now });
  const token = await t.token();
  call = (path, method = 'GET', body, auth = true) => Promise.resolve(app.request(path, { method, headers: { ...(auth ? { Authorization: `Bearer ${token}` } : {}), 'Content-Type': 'application/json', 'X-Time-Zone': ZONE }, body: body === undefined ? undefined : JSON.stringify(body) }));
});

test('GET /v1/widget/plan: only what the widget needs, and the plan is kept', async () => {
  const p = await plan();
  expect(p.slots.slice(0, 3)).toEqual([
    { at: '2026-11-25T09:00:00.000Z', cardId: 'c1', word: 'w1', translation: 't1', look: 1 },
    { at: '2026-11-25T09:30:00.000Z', cardId: 'c2', word: 'w2', translation: 't2', look: 1 },
    { at: '2026-11-25T10:00:00.000Z', cardId: 'c1', word: 'w1', translation: 't1', look: 2 },
  ]);
  expect(p.endsAt).toBe(p.slots.length ? new Date(new Date(p.slots.at(-1)!.at).getTime() + 30 * 60_000).toISOString() : null);
  expect(kept!.slots.length).toBe(p.slots.length);
  expect(kept!.countedUntil).toEqual(now);
});

test('the next call counts the slots that passed and goes on from there', async () => {
  await plan();
  now = at('2026-11-25T10:10:00Z'); // c1 and c2 had one full slot each
  const p = await plan();
  expect(kept!.looks).toEqual({ c1: 1, c2: 1 });
  expect(p.slots[0]).toMatchObject({ at: '2026-11-25T10:00:00.000Z', cardId: 'c1', look: 2 });
  now = at('2026-11-25T10:15:00Z');
  await plan();
  expect(kept!.looks).toEqual({ c1: 1, c2: 1 }); // nothing new passed
});

test('a word that is no longer hard leaves the plan and its looks', async () => {
  await plan();
  now = at('2026-11-25T10:10:00Z');
  hard = hard.filter((h) => h.id !== 'c1');
  const p = await plan();
  expect(new Set(p.slots.map((s) => s.cardId))).toEqual(new Set(['c2']));
  expect(kept!.looks).toEqual({ c2: 1 });
});

test('no hard words: an empty plan', async () => {
  hard = [];
  expect(await plan()).toEqual({ slots: [], endsAt: null });
});

test('no token: 401', async () => {
  expect((await call('/v1/widget/plan', 'GET', undefined, false)).status).toBe(401);
});

test('emptyState has nothing counted', () => {
  expect(emptyState(now)).toEqual({ slots: [], looks: {}, countedUntil: now });
});

test('a Hard swipe sets that word’s looks to 0; other swipes do not', async () => {
  const ID = '00000000-0000-4000-8000-0000000000c1';
  const state = (): WidgetState => ({ slots: [{ at: at('2026-11-25T08:00:00Z'), end: at('2026-11-25T08:30:00Z'), cardId: 'c2' }], looks: { [ID]: 4, c2: 2 }, countedUntil: at('2026-11-25T08:00:00Z') });
  kept = state();
  const card = { id: ID, deckId: 'd', deckTopic: 'Food', word: 'w1', translation: 't1', example: 'e', exampleTranslation: 'et', stage: 2, known: false, hard: true, dueAt: at('2026-11-25T00:00:00Z') };
  const saved: unknown[] = [];
  const cards = { get: async () => card, save: async (_id: string, patch: unknown) => void saved.push(patch) } as unknown as CardsStore;
  const widget: WidgetStore = { get: async () => kept, save: async (_userId, s) => void (kept = s) };
  const app = createApp({ keys: t.keys, issuer: ISSUER, users, cards, widget, reviewNow: () => now });
  const headers = { Authorization: `Bearer ${await t.token()}`, 'Content-Type': 'application/json' };
  const swipe = (direction: string) => app.request(`/v1/cards/${ID}/swipe`, { method: 'POST', headers, body: JSON.stringify({ direction }) });
  expect((await swipe('easy')).status).toBe(200);
  expect(kept!.looks).toEqual({ [ID]: 4, c2: 2 });
  expect((await swipe('hard')).status).toBe(200);
  expect(kept!.looks).toEqual({ c2: 3 }); // c1 starts again; the slot of c2 that passed is counted on the way
  expect(saved).toHaveLength(2); // the card itself is saved as before
});
