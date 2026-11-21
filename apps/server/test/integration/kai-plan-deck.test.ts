import { afterAll, beforeAll, expect, test } from 'vitest';

import { createApp } from '../../src/app.js';
import { createCardsStore } from '../../src/db/cards.js';
import { createDb } from '../../src/db/client.js';
import { createDecksStore } from '../../src/db/decks.js';
import { createKaiStore } from '../../src/db/kai.js';
import { createPlanStore } from '../../src/db/plans.js';
import { createProfilesStore } from '../../src/db/profiles.js';
import { createUsersStore } from '../../src/db/users.js';
import { loadEnv } from '../../src/env.js';
import { fixtureDeckMaker } from '../../src/llm/fixture.js';
import { buildKaiPrompt, fixtureKaiChat, type KaiChat, type KaiContext } from '../../src/llm/kai-chat.js';
import type { PlanItem } from '../../src/llm/plan-decks.js';
import { ISSUER, makeTestKeys } from '../helpers/tokens.js';

// A deck idea tapped in the word plan (Progress tab) reaches Kai as "A deck about <topic>".
// The deck card Kai shows must have the size the plan showed.
const env = loadEnv({ ...process.env, NODE_ENV: 'test' });
const { db, pool } = createDb(env.DATABASE_URL);
const plans = createPlanStore(db);
const now = new Date('2026-11-20T10:00:00Z');
let seen: KaiContext[] = [];
const fixture: KaiChat = { answer: async (c) => (seen.push(c), fixtureKaiChat.answer(c)) };
let kaiChat: KaiChat = fixture;
type Call = (path: string, method?: string, body?: unknown) => Promise<Response>;
let call: (sub: string) => Promise<Call>;

beforeAll(async () => {
  const t = await makeTestKeys();
  call = async (sub) => {
    const headers = { Authorization: `Bearer ${await t.token({ sub })}`, 'Content-Type': 'application/json' };
    return async (path, method = 'GET', body) =>
      createApp({
        keys: t.keys,
        issuer: ISSUER,
        users: createUsersStore(db),
        profiles: createProfilesStore(db),
        decks: createDecksStore(db),
        deckMaker: fixtureDeckMaker,
        cards: createCardsStore(db),
        kai: createKaiStore(db),
        kaiChat: { answer: (c) => kaiChat.answer(c) },
        kaiNow: () => now,
        plans,
      }).request(path, { method, headers, body: body === undefined ? undefined : JSON.stringify(body) });
  };
});
afterAll(() => pool.end());

const profile = { learningLanguage: 'Spanish', nativeLanguage: 'English', level: 'beginner', knownWords: 600, cefr: 'A2', goal: 'travel', goalOther: null, interests: ['food'] };
const PLAN: PlanItem[] = [
  { topic: 'Getting around the city', words: 30, kind: 'words + phrases' },
  { topic: 'Meeting new people', words: 20, kind: 'phrases' },
  { topic: 'At the hotel', words: 10, kind: 'words' },
];
type Turn = { messages: { decks?: { title: string; wordCount: number }[] }[] };
const start = async (plan: PlanItem[] | null = PLAN) => {
  const sub = crypto.randomUUID();
  const me = await call(sub);
  await me('/v1/profile', 'PUT', profile);
  if (plan) await plans.save(sub, plan, now);
  seen = [];
  kaiChat = fixture;
  return me;
};
const ask = async (me: Call, text: string) => {
  const turn = (await (await me('/v1/kai/chat/turns', 'POST', { text })).json()) as Turn;
  return turn.messages.flatMap((m) => m.decks ?? []);
};

test('a plan idea asked for in the chat: the deck card has the plan’s size', async () => {
  const me = await start();
  expect((await ask(me, 'A deck about Getting around the city')).map((d) => d.wordCount)).toEqual([30]);
  expect((await ask(me, 'a deck about at the hotel.')).map((d) => d.wordCount)).toEqual([10]);
});

test('Kai is told the plan’s size and kind', async () => {
  const me = await start();
  await ask(me, 'A deck about Meeting new people');
  expect(seen[0]!.planDeck).toEqual({ topic: 'Meeting new people', words: 20, kind: 'phrases' });
  const prompt = buildKaiPrompt(seen[0]!);
  expect(prompt.system + prompt.user).toMatch(/Meeting new people.*20.*phrases/s);
});

test('a model that picks another size is corrected to the plan’s size', async () => {
  const me = await start();
  kaiChat = { answer: async () => ({ lines: [{ text: '¡Claro!', translation: 'Sure!' }], decks: [{ topic: 'Getting around the city', title: 'Moverte por la ciudad', titleTranslation: 'Get around the city', reason: 'De tu plan', wordCount: 12 }] }) };
  expect((await ask(me, 'A deck about Getting around the city')).map((d) => d.wordCount)).toEqual([30]);
});

test('a topic that is not in the plan, or no plan at all: Kai’s own size stays', async () => {
  const me = await start();
  expect((await ask(me, 'A deck about football')).map((d) => d.wordCount)).toEqual([12]);
  expect(seen[0]!.planDeck).toBeUndefined();
  const none = await start(null);
  expect((await ask(none, 'A deck about Getting around the city')).map((d) => d.wordCount)).toEqual([12]);
});
