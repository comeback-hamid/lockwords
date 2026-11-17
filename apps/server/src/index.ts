import { serve } from '@hono/node-server';
import { createRemoteJWKSet } from 'jose';
import { PgBoss } from 'pg-boss';

import { createApp } from './app.js';
import { createCardsStore } from './db/cards.js';
import { createDb } from './db/client.js';
import { createDecksStore } from './db/decks.js';
import { createKaiStore } from './db/kai.js';
import { createProfilesStore } from './db/profiles.js';
import { createUsersStore } from './db/users.js';
import { createQueuedDeckJobs } from './decks/queued-jobs.js';
import { loadEnv } from './env.js';
import { fixtureLanguageChecker } from './llm/check-language.js';
import { claudeDeckMaker, claudeKaiChat, claudeLanguageChecker, claudeUseItJudge } from './llm/claude.js';
import { fixtureDeckMaker, fixtureUseItJudge } from './llm/fixture.js';
import { fixtureKaiChat } from './llm/kai-chat.js';

const env = loadEnv();
const { db } = createDb(env.DATABASE_URL);
const profiles = createProfilesStore(db);
const decks = createDecksStore(db);
// No key (local runs) = the fixture deck for every topic.
const deckMaker = env.ANTHROPIC_API_KEY ? claudeDeckMaker(env.ANTHROPIC_API_KEY) : fixtureDeckMaker;
// Background jobs live in our own Postgres (pg-boss makes its tables on first start).
const boss = new PgBoss(env.DATABASE_URL);
boss.on('error', (e) => console.error('pg-boss', e.message));
await boss.start();

const app = createApp({
  keys: createRemoteJWKSet(new URL('/auth/v1/.well-known/jwks.json', env.SUPABASE_URL)),
  issuer: env.SUPABASE_JWT_ISSUER,
  users: createUsersStore(db),
  profiles,
  decks,
  deckMaker,
  deckJobs: await createQueuedDeckJobs(boss, db, { profiles, decks, deckMaker }),
  cards: createCardsStore(db),
  languageChecker: env.ANTHROPIC_API_KEY ? claudeLanguageChecker(env.ANTHROPIC_API_KEY) : fixtureLanguageChecker,
  useItJudge: env.ANTHROPIC_API_KEY ? claudeUseItJudge(env.ANTHROPIC_API_KEY) : fixtureUseItJudge,
  kai: createKaiStore(db),
  kaiChat: env.ANTHROPIC_API_KEY ? claudeKaiChat(env.ANTHROPIC_API_KEY) : fixtureKaiChat,
});
serve({ fetch: app.fetch, port: env.PORT }, (info) => {
  console.log(`server on http://localhost:${info.port}`);
});
