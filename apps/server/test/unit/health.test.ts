import { expect, test } from 'vitest';

import { createApp } from '../../src/app.js';

test('GET /health says ok', async () => {
  const res = await createApp().request('/health');
  expect(res.status).toBe(200);
  expect(await res.json()).toEqual({ ok: true });
});
