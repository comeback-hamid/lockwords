import { OpenAPIHono } from '@hono/zod-openapi';

import { requireUser, type AuthSettings } from './auth.js';
import { health } from './routes/health.js';
import type { Profile } from './onboarding/profile.js';
import { meRoutes } from './routes/me.js';
import { onboardingRoutes } from './routes/onboarding.js';

export type UsersStore = {
  upsert(id: string, isGuest: boolean): Promise<{ id: string; isGuest: boolean; createdAt: Date }>;
};
export type ProfilesStore = { upsert(userId: string, profile: Profile): Promise<Profile> };
// profiles is optional so tests of other routes do not have to fake it.
export type AppDeps = AuthSettings & { users: UsersStore; profiles?: ProfilesStore };

// Without deps (some unit tests) every /v1 route answers 401.
export function createApp(deps?: AppDeps) {
  const app = new OpenAPIHono();
  app.route('/health', health);
  app.use('/v1/*', requireUser(deps));
  app.route('/v1', meRoutes(deps?.users));
  app.route('/v1', onboardingRoutes(deps?.profiles));
  app.openAPIRegistry.registerComponent('securitySchemes', 'bearer', { type: 'http', scheme: 'bearer', bearerFormat: 'JWT' });
  app.doc31('/openapi.json', { openapi: '3.1.0', info: { title: 'Lockwords API', version: '1' } });
  return app;
}
