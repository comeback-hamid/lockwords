import { createRoute, OpenAPIHono, z } from '@hono/zod-openapi';

import type { UsersStore } from '../app.js';
import type { AuthUser } from '../auth.js';

export const UnauthorizedSchema = z.object({ error: z.literal('unauthorized') }).openapi('Unauthorized');
const MeSchema = z
  .object({ id: z.uuid(), isGuest: z.boolean(), createdAt: z.iso.datetime() })
  .openapi('Me');

const route = createRoute({
  method: 'get',
  path: '/me',
  security: [{ bearer: [] }],
  responses: {
    200: { description: 'Who the caller is', content: { 'application/json': { schema: MeSchema } } },
    401: { description: 'No valid login token', content: { 'application/json': { schema: UnauthorizedSchema } } },
  },
});

export function meRoutes(users: UsersStore | undefined) {
  return new OpenAPIHono<{ Variables: { user: AuthUser } }>().openapi(route, async (c) => {
    const { id, isGuest } = c.get('user');
    const row = await users!.upsert(id, isGuest); // users is set whenever auth is set (see createApp)
    return c.json({ id: row.id, isGuest: row.isGuest, createdAt: row.createdAt.toISOString() }, 200);
  });
}
