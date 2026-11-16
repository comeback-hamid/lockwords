import { beforeAll, expect, test, vi } from 'vitest';

import { createApp, type UsersStore } from '../../src/app.js';
import { ISSUER, makeTestKeys } from '../helpers/tokens.js';

let t: Awaited<ReturnType<typeof makeTestKeys>>;
const rows = new Map<string, { id: string; isGuest: boolean; createdAt: Date }>();
const users: UsersStore = {
  async upsert(id, isGuest) {
    const row = rows.get(id) ?? { id, isGuest, createdAt: new Date() };
    row.isGuest = isGuest;
    rows.set(id, row);
    return row;
  },
};
const app = () => createApp({ keys: t.keys, issuer: ISSUER, users });
const me = (token?: string) => app().request('/v1/me', { headers: token ? { Authorization: `Bearer ${token}` } : {} });

beforeAll(async () => {
  t = await makeTestKeys();
});

test('no token → 401', async () => {
  const res = await me();
  expect(res.status).toBe(401);
  expect(await res.json()).toEqual({ error: 'unauthorized' });
});

test('bad signature → 401', async () => {
  const res = await me(await t.token({ wrongKey: true }));
  expect(res.status).toBe(401);
  expect(await res.json()).toEqual({ error: 'unauthorized' });
});

test('expired token → 401', async () => {
  expect((await me(await t.token({ expiresIn: '-1h' }))).status).toBe(401);
});

test('wrong issuer → 401', async () => {
  expect((await me(await t.token({ issuer: 'https://other.supabase.co/auth/v1' }))).status).toBe(401);
});

test('no auth settings at all → /v1 is closed (401), /health is open', async () => {
  const bare = createApp();
  expect((await bare.request('/v1/me', { headers: { Authorization: `Bearer ${await t.token()}` } })).status).toBe(401);
  expect((await bare.request('/health')).status).toBe(200);
});

test('guest token → 200 with isGuest true and the token user id', async () => {
  const sub = crypto.randomUUID();
  const res = await me(await t.token({ sub, isGuest: true }));
  expect(res.status).toBe(200);
  const body = (await res.json()) as { id: string; isGuest: boolean; createdAt: string };
  expect(body.id).toBe(sub);
  expect(body.isGuest).toBe(true);
  expect(Number.isNaN(Date.parse(body.createdAt))).toBe(false);
});

test('non-guest token → isGuest false', async () => {
  const res = await me(await t.token({ isGuest: false }));
  expect(((await res.json()) as { isGuest: boolean }).isGuest).toBe(false);
});

test('the token is never logged', async () => {
  const spies = (['log', 'info', 'warn', 'error'] as const).map((m) => vi.spyOn(console, m).mockImplementation(() => {}));
  const good = await t.token();
  const bad = await t.token({ wrongKey: true });
  await me(good);
  await me(bad);
  const logged = JSON.stringify(spies.flatMap((s) => s.mock.calls));
  for (const tok of [good, bad]) for (const part of tok.split('.')) expect(logged).not.toContain(part);
  spies.forEach((s) => s.mockRestore());
});
