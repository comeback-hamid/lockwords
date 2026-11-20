import { beforeAll, expect, test } from 'vitest';

import { createApp, type UsersStore } from '../../src/app.js';
import { loadEnv } from '../../src/env.js';
import { ISSUER, makeTestKeys } from '../helpers/tokens.js';

const users: UsersStore = { upsert: async (id, isGuest) => ({ id, isGuest, createdAt: new Date() }) };
let app: ReturnType<typeof createApp>;
beforeAll(async () => {
  const t = await makeTestKeys();
  app = createApp({ keys: t.keys, issuer: ISSUER, users, webOrigins: ['https://app.lockwords.example'] });
});
const preflight = (origin: string) => app.request('/v1/me', { method: 'OPTIONS', headers: { Origin: origin, 'Access-Control-Request-Method': 'GET', 'Access-Control-Request-Headers': 'authorization,x-time-zone' } });

test('the web app’s address and localhost (while developing) may call the API from a browser', async () => {
  for (const origin of ['https://app.lockwords.example', 'http://localhost:8095', 'http://127.0.0.1:3000']) {
    const res = await preflight(origin);
    expect(res.status).toBe(204);
    expect(res.headers.get('Access-Control-Allow-Origin')).toBe(origin);
    expect(res.headers.get('Access-Control-Allow-Headers')).toContain('X-Time-Zone');
  }
});

test('another site is not allowed', async () => {
  const res = await preflight('https://evil.example');
  expect(res.headers.get('Access-Control-Allow-Origin')).toBeNull();
});

test('a call with no login still gets the allow header, so the browser can read the 401', async () => {
  const res = await app.request('/v1/me', { headers: { Origin: 'http://localhost:8095' } });
  expect(res.status).toBe(401);
  expect(res.headers.get('Access-Control-Allow-Origin')).toBe('http://localhost:8095');
});

test('WEB_ORIGINS is a comma list in the environment', () => {
  const base = { ...process.env, NODE_ENV: 'test', DATABASE_URL: 'postgres://localhost:5432/lockwords_test' };
  const env = loadEnv({ ...base, WEB_ORIGINS: 'https://a.example, https://b.example' });
  expect(env.WEB_ORIGINS).toEqual(['https://a.example', 'https://b.example']);
  expect(loadEnv({ ...base, WEB_ORIGINS: undefined }).WEB_ORIGINS).toEqual([]);
});
