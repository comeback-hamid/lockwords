import { expect, test } from 'vitest';

import { fixtureSheetMaker, gridFor } from '../../src/llm/deck-pictures.js';
import { devPictureRoutes, pictureDelay } from '../../src/routes/dev-pictures.js';

// A Maestro flow that checks the "drawing the pictures" wait needs slow stand-in pictures; every other flow wants them
// at once. `npm run e2e` sets the wait for those flows only, through this local-only route (never mounted in production).
const post = (app: ReturnType<typeof devPictureRoutes>, body: unknown) =>
  app.request('/dev/fixture-picture-ms', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });

test('the route sets how long the stand-in sheet takes', async () => {
  const delay = pictureDelay(0);
  const res = await post(devPictureRoutes(delay), { ms: 30000 });
  expect(res.status).toBe(200);
  expect(await res.json()).toEqual({ ms: 30000 });
  expect(delay.get()).toBe(30000);
});

test('a wrong value is refused and changes nothing', async () => {
  const delay = pictureDelay(500);
  for (const body of [{ ms: -1 }, { ms: 'soon' }, { ms: 999999 }, {}, null]) {
    expect((await post(devPictureRoutes(delay), body)).status).toBe(400);
  }
  expect(delay.get()).toBe(500);
});

test('the stand-in sheet reads the wait at each call, so a change is felt by the next deck', async () => {
  const delay = pictureDelay(0);
  const maker = fixtureSheetMaker(delay.get);
  const items = Array.from({ length: 10 }, (_, i) => ({ word: `w${i}`, meaning: `m${i}` }));
  const timed = async () => {
    const t = Date.now();
    await maker.sheet(items as never, gridFor(10));
    return Date.now() - t;
  };
  const fast = await timed();
  delay.set(300);
  const slow = await timed();
  expect(slow).toBeGreaterThanOrEqual(290);
  expect(slow - fast).toBeGreaterThan(200);
});
