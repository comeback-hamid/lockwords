import { serve } from '@hono/node-server';
import { createRemoteJWKSet } from 'jose';
import { PgBoss } from 'pg-boss';

import { createApp } from './app.js';
import { createCardsStore } from './db/cards.js';
import { createKaiScriptStore } from './db/kai-scripts.js';
import { createDb } from './db/client.js';
import { createDecksStore } from './db/decks.js';
import { createKaiStore } from './db/kai.js';
import { createRandomWordsStore } from './decks/random-words.js';
import { createProfilesStore } from './db/profiles.js';
import { createUsersStore } from './db/users.js';
import { createWordTestStore } from './db/word-tests.js';
import { createQueuedDeckJobs } from './decks/queued-jobs.js';
import { loadEnv } from './env.js';
import { fixtureLanguageChecker } from './llm/check-language.js';
import { claudeDeckMaker, claudeKaiChat, claudeKaiReplier, claudeLanguageChecker, claudeScriptTranslator, claudeUseItJudge, claudeWordAsker } from './llm/claude.js';
import { fixtureDeckMaker, fixtureKaiReplier, fixtureScriptTranslator, fixtureUseItJudge, fixtureWordAsker } from './llm/fixture.js';
import { fixtureKaiChat } from './llm/kai-chat.js';
import { claudeWordPackMaker, fixtureWordPackMaker } from './llm/word-pack.js';

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
  wordAsker: env.ANTHROPIC_API_KEY ? claudeWordAsker(env.ANTHROPIC_API_KEY) : fixtureWordAsker,
  kaiScripts: createKaiScriptStore(db),
  scriptTranslator: env.ANTHROPIC_API_KEY ? claudeScriptTranslator(env.ANTHROPIC_API_KEY) : fixtureScriptTranslator,
  kai: createKaiStore(db),
  randomWords: createRandomWordsStore(db),
  kaiChat: env.ANTHROPIC_API_KEY ? claudeKaiChat(env.ANTHROPIC_API_KEY) : fixtureKaiChat,
  wordTests: createWordTestStore(db),
  // No key = a typed language gets no word test (the listed 13 always have one).
  wordPackMaker: env.ANTHROPIC_API_KEY ? claudeWordPackMaker(env.ANTHROPIC_API_KEY) : fixtureWordPackMaker,
  kaiReplier: env.ANTHROPIC_API_KEY ? claudeKaiReplier(env.ANTHROPIC_API_KEY) : fixtureKaiReplier,
});
serve({ fetch: app.fetch, port: env.PORT }, (info) => {
  console.log(`server on http://localhost:${info.port}`);
});
