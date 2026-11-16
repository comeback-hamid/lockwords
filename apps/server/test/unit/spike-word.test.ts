import { describe, expect, it } from 'vitest';

import { createApp } from '../../src/app.js';

describe('GET /spike/word', () => {
  it('returns one word for the widget', async () => {
    const res = await createApp().request('/spike/word');
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body).toMatchObject({ word: 'la mariposa', meaning: 'the butterfly', stage: 2 });
  });
});
