import { createRoute, OpenAPIHono, z } from '@hono/zod-openapi';

import type { ProfilesStore, UsersStore } from '../app.js';
import type { AuthUser } from '../auth.js';
import { ProfileSchema } from '../onboarding/profile.js';
import { UnauthorizedSchema } from './me.js';

const json = <T extends z.ZodType>(schema: T, description: string) => ({ description, content: { 'application/json': { schema } } });
const BadRequestSchema = z.object({ error: z.literal('bad_request') }).openapi('BadRequest');
const errors = { 400: json(BadRequestSchema, 'The request is not valid'), 401: json(UnauthorizedSchema, 'No valid login token') };
const security = [{ bearer: [] }];

const putProfile = createRoute({
  method: 'put',
  path: '/profile',
  security,
  request: { body: { required: true, content: { 'application/json': { schema: ProfileSchema } } } },
  responses: { 200: json(ProfileSchema, 'The saved profile'), ...errors },
});

export function onboardingRoutes(users: UsersStore | undefined, profiles: ProfilesStore | undefined) {
  const app = new OpenAPIHono<{ Variables: { user: AuthUser } }>({
    // Every bad query or body gets the same short answer.
    defaultHook: (result, c) => (result.success ? undefined : c.json({ error: 'bad_request' as const }, 400)),
  });
  return app
    .openapi(putProfile, async (c) => {
      if (!users || !profiles) throw new Error('profiles store is not set');
      // The profile row points to the user row, and this can be the user's first call.
      const { id, isGuest } = c.get('user');
      await users.upsert(id, isGuest);
      return c.json(await profiles.upsert(id, c.req.valid('json')), 200);
    });
}
