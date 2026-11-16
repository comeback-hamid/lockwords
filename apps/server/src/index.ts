import { serve } from '@hono/node-server';
import { createRemoteJWKSet } from 'jose';

import { createApp } from './app.js';
import { createCardsStore } from './db/cards.js';
import { createDb } from './db/client.js';
import { createDecksStore } from './db/decks.js';
import { createProfilesStore } from './db/profiles.js';
import { createUsersStore } from './db/users.js';
import { loadEnv } from './env.js';
import { claudeDeckMaker, claudeUseItJudge } from './llm/claude.js';
import { fixtureDeckMaker, fixtureUseItJudge } from './llm/fixture.js';

const env = loadEnv();
const { db } = createDb(env.DATABASE_URL);
const app = createApp({
  keys: createRemoteJWKSet(new URL('/auth/v1/.well-known/jwks.json', env.SUPABASE_URL)),
  issuer: env.SUPABASE_JWT_ISSUER,
  users: createUsersStore(db),
  profiles: createProfilesStore(db),
  decks: createDecksStore(db),
  // No key (local runs) = the fixture deck for every topic.
  deckMaker: env.ANTHROPIC_API_KEY ? claudeDeckMaker(env.ANTHROPIC_API_KEY) : fixtureDeckMaker,
  cards: createCardsStore(db),
  useItJudge: env.ANTHROPIC_API_KEY ? claudeUseItJudge(env.ANTHROPIC_API_KEY) : fixtureUseItJudge,
});
serve({ fetch: app.fetch, port: env.PORT }, (info) => {
  console.log(`server on http://localhost:${info.port}`);
});
