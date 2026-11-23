import { Hono } from 'hono';

// Local test runs only. `src/index.ts` mounts this route only when the stand-in sheet maker is in use: never in
// production and never with a real image key. It is not part of the app's API, so it is not in `openapi.json`.
//
// Why: one Maestro flow (`deck-pictures`) checks the "drawing the pictures" wait and needs slow stand-in pictures;
// every other flow wants them at once. `npm run e2e` sets the wait before those flows and puts it back after.
const MAX_MS = 120_000;

export type PictureDelay = { get(): number; set(ms: number): void };

export function pictureDelay(initialMs: number): PictureDelay {
  let ms = initialMs;
  return { get: () => ms, set: (next) => void (ms = next) };
}

export function devPictureRoutes(delay: PictureDelay) {
  const app = new Hono();
  app.post('/dev/fixture-picture-ms', async (c) => {
    const body: unknown = await c.req.json().catch(() => null);
    const ms = body && typeof body === 'object' ? (body as { ms?: unknown }).ms : undefined;
    if (typeof ms !== 'number' || !Number.isFinite(ms) || ms < 0 || ms > MAX_MS) return c.json({ error: `ms must be a number from 0 to ${MAX_MS}` }, 400);
    delay.set(ms);
    return c.json({ ms });
  });
  return app;
}
