import { beforeAll, beforeEach, expect, test, vi } from 'vitest';

import { createApp, type DecksStore, type ProfilesStore, type UsersStore } from '../../src/app.js';
import type { DeckJobs } from '../../src/decks/jobs.js';
import { fixtureDeckMaker } from '../../src/llm/fixture.js';
import { ISSUER, makeTestKeys } from '../helpers/tokens.js';

// A queue that works in the background: `start` only marks the deck, the test finishes the job by hand.
type Deck = Awaited<ReturnType<DecksStore['create']>>;
let t: Awaited<ReturnType<typeof makeTestKeys>>;
let deck: Deck;
let start: ReturnType<typeof vi.fn<DeckJobs['start']>>;
let call: (path: string, method?: string) => Promise<Response>;

const users: UsersStore = { upsert: async (id, isGuest) => ({ id, isGuest, createdAt: new Date() }) };
const profiles = { get: async () => null } as unknown as ProfilesStore;
const decks = { get: async () => deck } as unknown as DecksStore;
const finish = () => (deck = { ...deck, status: 'ready', cards: [{ id: 'c', position: 0, stage: 0, word: 'w', translation: 't', example: 'e', exampleTranslation: 'et' }] });

beforeAll(async () => {
  t = await makeTestKeys();
});
beforeEach(async () => {
  deck = { id: crypto.randomUUID(), topic: 'Food', title: 'Food', reason: 'r', cefr: 'A1', wordCount: 10, status: 'proposed', cards: [] };
  start = vi.fn<DeckJobs['start']>(async () => {
    deck = { ...deck, status: 'generating' };
    return 'queued';
  });
  const app = createApp({ keys: t.keys, issuer: ISSUER, users, profiles, decks, deckMaker: fixtureDeckMaker, deckJobs: { start }, deckWaitMs: 150 });
  const headers = { Authorization: `Bearer ${await t.token()}` };
  call = (path, method = 'GET') => Promise.resolve(app.request(path, { method, headers }));
});

test('the job finishes while the request waits → the ready deck', async () => {
  setTimeout(finish, 40);
  const res = await call(`/v1/decks/${deck.id}/generate`, 'POST');
  expect(res.status).toBe(200);
  expect(await res.json()).toMatchObject({ status: 'ready', cards: [{ word: 'w' }] });
});

test('the job is slow → the deck comes back as generating, a second call starts no second job, and reading it later shows ready', async () => {
  const res = await call(`/v1/decks/${deck.id}/generate`, 'POST');
  expect(res.status).toBe(200);
  expect(await res.json()).toMatchObject({ status: 'generating', cards: [] });
  await call(`/v1/decks/${deck.id}/generate`, 'POST');
  expect(start).toHaveBeenCalledTimes(1);
  finish();
  expect(await (await call(`/v1/decks/${deck.id}`)).json()).toMatchObject({ status: 'ready' });
});

test('the job fails (the deck goes back to proposed) → 502', async () => {
  setTimeout(() => (deck = { ...deck, status: 'proposed' }), 40);
  const res = await call(`/v1/decks/${deck.id}/generate`, 'POST');
  expect(res.status).toBe(502);
  expect(await res.json()).toEqual({ error: 'generation_failed' });
});
