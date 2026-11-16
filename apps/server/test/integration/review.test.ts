import { sql } from 'drizzle-orm';
import { afterAll, beforeAll, expect, test } from 'vitest';

import { createApp } from '../../src/app.js';
import { createCardsStore } from '../../src/db/cards.js';
import { createDb } from '../../src/db/client.js';
import { createDecksStore } from '../../src/db/decks.js';
import { createProfilesStore } from '../../src/db/profiles.js';
import { createUsersStore } from '../../src/db/users.js';
import { loadEnv } from '../../src/env.js';
import { fixtureDeckMaker, fixtureUseItJudge } from '../../src/llm/fixture.js';
import { ISSUER, makeTestKeys } from '../helpers/tokens.js';

const env = loadEnv({ ...process.env, NODE_ENV: 'test' });
const { db, pool } = createDb(env.DATABASE_URL);
let call: (sub: string) => Promise<(path: string, method?: string, body?: unknown) => Promise<Response>>;

beforeAll(async () => {
  const t = await makeTestKeys();
  const app = createApp({ keys: t.keys, issuer: ISSUER, users: createUsersStore(db), profiles: createProfilesStore(db), decks: createDecksStore(db), deckMaker: fixtureDeckMaker, cards: createCardsStore(db), useItJudge: fixtureUseItJudge });
  call = async (sub) => {
    const headers = { Authorization: `Bearer ${await t.token({ sub })}`, 'Content-Type': 'application/json' };
    return async (path, method = 'GET', body) => app.request(path, { method, headers, body: body === undefined ? undefined : JSON.stringify(body) });
  };
});
afterAll(() => pool.end());

type Card = { id: string; word: string; deckTopic: string; stage: number };

test('deck → round of 10 → easy, hard, known → round shrinks → hard words → use it; a proposed deck and other users see nothing', async () => {
  const sub = crypto.randomUUID();
  const me = await call(sub);
  await me('/v1/profile', 'PUT', { learningLanguage: 'es', nativeLanguage: 'en', level: 'beginner', knownWords: null, cefr: null, goal: 'travel', goalOther: null, interests: ['food'] });
  await me('/v1/decks', 'POST', { topic: 'Not made yet' }); // proposed only: its cards do not exist
  const deck = (await (await me('/v1/decks', 'POST', { topic: 'Ordering food' })).json()) as { id: string };
  await me(`/v1/decks/${deck.id}/generate`, 'POST');

  const round = ((await (await me('/v1/review')).json()) as { cards: Card[] }).cards;
  expect(round.map((c) => c.word)).toEqual(['la cuenta', 'la propina', 'pedir', 'el camarero', 'la carta', 'el plato', 'la bebida', 'reservar', 'el postre', 'pagar']);
  expect(round[0]).toMatchObject({ deckTopic: 'Ordering food', stage: 0 });

  expect(await (await me(`/v1/cards/${round[0]!.id}/swipe`, 'POST', { direction: 'easy' })).json()).toMatchObject({ stage: 1, backInDays: 1 });
  expect(await (await me(`/v1/cards/${round[1]!.id}/swipe`, 'POST', { direction: 'hard' })).json()).toMatchObject({ stage: 1, hard: true });
  expect(await (await me(`/v1/cards/${round[2]!.id}/swipe`, 'POST', { direction: 'known' })).json()).toMatchObject({ known: true });
  expect(((await (await me('/v1/review')).json()) as { cards: Card[] }).cards).toHaveLength(7);
  expect(await (await me('/v1/hard-words')).json()).toEqual({ words: [{ word: 'la propina', translation: 'the tip' }] });

  // A card that is due again shows up first.
  await db.execute(sql`update cards set due_at = now() - interval '1 hour' where id = ${round[1]!.id}`);
  expect(((await (await me('/v1/review')).json()) as { cards: Card[] }).cards[0]!.word).toBe('la propina');

  expect(await (await me(`/v1/cards/${round[1]!.id}/use-it`, 'POST', { sentence: 'Dejé propina al mesero.' })).json()).toMatchObject({ good: true, movedUp: true, stage: 2 });

  const stranger = await call(crypto.randomUUID());
  expect(((await (await stranger('/v1/review')).json()) as { cards: Card[] }).cards).toEqual([]);
  expect((await stranger(`/v1/cards/${round[3]!.id}/swipe`, 'POST', { direction: 'easy' })).status).toBe(404);
});
