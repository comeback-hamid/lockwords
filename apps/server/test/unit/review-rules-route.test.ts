import { beforeAll, expect, test } from 'vitest';

import { createApp, type CardsStore, type UsersStore } from '../../src/app.js';
import { applySwipe } from '../../src/review/srs.js';
import { ISSUER, makeTestKeys } from '../helpers/tokens.js';

// The app shows "BACK IN N DAYS" on the Easy label while the finger still moves, before the swipe is saved.
// The numbers are the server's: the app reads this table and never works them out itself.
let t: Awaited<ReturnType<typeof makeTestKeys>>;
const users: UsersStore = { upsert: async (id, isGuest) => ({ id, isGuest, createdAt: new Date() }) };
const cards = { round: async () => [], get: async () => null, save: async () => {}, hardWords: async () => [], languages: async () => ({ learningLanguage: 'es', nativeLanguage: 'en' }) } as CardsStore;
const app = () => createApp({ keys: t.keys, issuer: ISSUER, users, cards });

beforeAll(async () => {
  t = await makeTestKeys();
});

test('GET /v1/review/rules: days until an Easy card comes back, by the stage it has now (0 = new … 5)', async () => {
  const res = await app().request('/v1/review/rules', { headers: { Authorization: `Bearer ${await t.token({ sub: crypto.randomUUID() })}` } });
  expect(res.status).toBe(200);
  expect(await res.json()).toEqual({ easyBackInDays: [3, 3, 7, 14, 30, 30] });
});

test('the table is the swipe rule itself, not a copy of it', async () => {
  const res = await app().request('/v1/review/rules', { headers: { Authorization: `Bearer ${await t.token({ sub: crypto.randomUUID() })}` } });
  const { easyBackInDays } = (await res.json()) as { easyBackInDays: number[] };
  const now = new Date('2026-11-23T10:00:00Z');
  expect(easyBackInDays).toEqual([0, 1, 2, 3, 4, 5].map((stage) => applySwipe({ stage, known: false, hard: false, dueAt: null }, 'easy', now).backInDays));
});

test('no login → 401', async () => {
  expect((await app().request('/v1/review/rules')).status).toBe(401);
});
