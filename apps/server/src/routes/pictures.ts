import { Hono } from 'hono';
import type { Context } from 'hono';
import { z } from 'zod';

import type { PicturesStore } from '../app.js';

// Card pictures. No login: an <Image> on a phone sends no token, and the address holds a random id nobody can guess.
// A picture never changes, so phones may keep it for a year.
export function pictureRoutes(pictures?: PicturesStore) {
  return new Hono().get('/:id', async (c) => {
    const id = c.req.param('id');
    const data = pictures && z.uuid().safeParse(id).success ? await pictures.read(id) : null;
    if (!data) return c.json({ error: 'not_found' as const }, 404);
    return c.body(new Uint8Array(data), 200, { 'Content-Type': 'image/webp', 'Cache-Control': 'public, max-age=31536000, immutable' });
  });
}

// Where this server is reached from outside (behind the cloud's proxy the request itself says http).
export function publicOrigin(c: Context): string {
  const url = new URL(c.req.url);
  const proto = c.req.header('x-forwarded-proto')?.split(',')[0]?.trim() || url.protocol.replace(':', '');
  return `${proto}://${c.req.header('x-forwarded-host') ?? url.host}`;
}

// A stored picture path ("/pictures/<id>") as a full address the app can load; none = null.
export const imageUrl = (origin: string, path: string | null | undefined) => (path ? `${origin}${path}` : null);
