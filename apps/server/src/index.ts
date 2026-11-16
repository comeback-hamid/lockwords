import { serve } from '@hono/node-server';
import { createRemoteJWKSet } from 'jose';

import { createApp } from './app.js';
import { createDb } from './db/client.js';
import { createProfilesStore } from './db/profiles.js';
import { createUsersStore } from './db/users.js';
import { loadEnv } from './env.js';

const env = loadEnv();
const { db } = createDb(env.DATABASE_URL);
const app = createApp({
  keys: createRemoteJWKSet(new URL('/auth/v1/.well-known/jwks.json', env.SUPABASE_URL)),
  issuer: env.SUPABASE_JWT_ISSUER,
  users: createUsersStore(db),
  profiles: createProfilesStore(db),
});
serve({ fetch: app.fetch, port: env.PORT }, (info) => {
  console.log(`server on http://localhost:${info.port}`);
});
