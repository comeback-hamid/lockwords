import { beforeAll, beforeEach, expect, test } from 'vitest';

import { createApp, type DecksStore, type ProfilesStore, type UsersStore } from '../../src/app.js';
import { claudeDeckMaker } from '../../src/llm/claude.js';
import { fixtureDeckMaker } from '../../src/llm/fixture.js';
import type { DeckMaker } from '../../src/llm/make-deck.js';
import { ideasFor } from '../../src/decks/ideas.js';
import { GOALS, type Profile } from '../../src/onboarding/profile.js';
import { ISSUER, makeTestKeys } from '../helpers/tokens.js';

const profile: Profile = { learningLanguage: 'es', nativeLanguage: 'en', level: 'some_basics', knownWords: 1850, cefr: 'A2+', goal: 'travel', goalOther: null, interests: ['food'] };
type Deck = Awaited<ReturnType<DecksStore['create']>>;

let t: Awaited<ReturnType<typeof makeTestKeys>>;
let profiles: Map<string, Profile & { name?: string; chatLanguage?: string }>;
let decks: Map<string, Deck & { userId: string }>;
let maker: DeckMaker;

const users: UsersStore = { upsert: async (id, isGuest) => ({ id, isGuest, createdAt: new Date() }) };
const profilesStore: ProfilesStore = {
  upsert: async (userId, p) => (profiles.set(userId, p), p),
  get: async (userId) => profiles.get(userId) ?? null,
  setChat: async (userId, name, chatLanguage) => {
    const p = profiles.get(userId);
    if (!p) return false;
    profiles.set(userId, { ...p, name, chatLanguage });
    return true;
  },
};
const decksStore: DecksStore = {
  create: async (userId, d) => {
    const deck = { ...d, id: crypto.randomUUID(), wordCount: 10, status: 'proposed' as const, cards: [] };
    decks.set(deck.id, { ...deck, userId });
    return deck;
  },
  get: async (userId, id) => {
    const d = decks.get(id);
    if (!d || d.userId !== userId) return null;
    const { userId: _owner, ...deck } = d;
    void _owner;
    return deck;
  },
  saveCards: async (id, cards) => {
    const d = decks.get(id)!;
    d.cards = cards.map((c, i) => ({ ...c, id: crypto.randomUUID(), position: i, stage: 0 }));
    d.status = 'ready';
    const { userId: _owner, ...deck } = d;
    void _owner;
    return deck;
  },
};

const app = () => createApp({ keys: t.keys, issuer: ISSUER, users, profiles: profilesStore, decks: decksStore, deckMaker: maker });
const as = (token: string) => (path: string, method = 'GET', body?: unknown) =>
  app().request(path, { method, headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' }, body: body === undefined ? undefined : JSON.stringify(body) });

let alice: ReturnType<typeof as>;
let bob: ReturnType<typeof as>;
let newcomer: ReturnType<typeof as>;

beforeAll(async () => {
  t = await makeTestKeys();
});
beforeEach(async () => {
  profiles = new Map();
  decks = new Map();
  maker = fixtureDeckMaker;
  const [a, b] = [crypto.randomUUID(), crypto.randomUUID()];
  profiles.set(a, profile);
  profiles.set(b, { ...profile, goal: 'work', cefr: null });
  alice = as(await t.token({ sub: a }));
  bob = as(await t.token({ sub: b }));
  newcomer = as(await t.token());
});

test('deck ideas: four different ideas for every goal; travel matches Figma', () => {
  expect(ideasFor('travel')).toEqual(['Ordering food', 'Getting around the city', 'Meeting new people', 'At the hotel']);
  for (const goal of GOALS) {
    const ideas = ideasFor(goal);
    expect(ideas).toHaveLength(4);
    expect(new Set(ideas).size).toBe(4);
    expect(ideas.every((i) => i.length > 0)).toBe(true);
  }
});

test('GET /v1/deck-ideas uses the profile goal; no profile gets the travel ideas', async () => {
  expect(((await (await alice('/v1/deck-ideas')).json()) as { ideas: string[] }).ideas).toEqual(ideasFor('travel'));
  expect(((await (await bob('/v1/deck-ideas')).json()) as { ideas: string[] }).ideas).toEqual(ideasFor('work'));
  expect(((await (await newcomer('/v1/deck-ideas')).json()) as { ideas: string[] }).ideas).toEqual(ideasFor('travel'));
});

test('PUT /v1/profile/chat saves the name and chat language', async () => {
  const res = await alice('/v1/profile/chat', 'PUT', { name: 'Maya', chatLanguage: 'native' });
  expect(res.status).toBe(200);
  expect(await res.json()).toEqual({ name: 'Maya', chatLanguage: 'native' });
  expect([...profiles.values()][0]).toMatchObject({ name: 'Maya', chatLanguage: 'native' });
  expect((await newcomer('/v1/profile/chat', 'PUT', { name: 'Maya', chatLanguage: 'native' })).status).toBe(409);
  expect((await alice('/v1/profile/chat', 'PUT', { name: '', chatLanguage: 'native' })).status).toBe(400);
  expect((await alice('/v1/profile/chat', 'PUT', { name: 'Maya', chatLanguage: 'klingon' })).status).toBe(400);
});

test('propose: 201, proposed, 10 words, no cards, level from the profile', async () => {
  const res = await alice('/v1/decks', 'POST', { topic: 'Ordering food' });
  expect(res.status).toBe(201);
  const deck = (await res.json()) as Deck;
  expect(deck).toMatchObject({ topic: 'Ordering food', status: 'proposed', wordCount: 10, cefr: 'A2+', cards: [] });
  expect(deck.title.length).toBeGreaterThan(0);
  const bobs = (await (await bob('/v1/decks', 'POST', { topic: 'Meetings' })).json()) as Deck;
  expect(bobs.cefr).toBe('A1');
});

test('propose: no profile → 409; bad topic → 400', async () => {
  const res = await newcomer('/v1/decks', 'POST', { topic: 'Ordering food' });
  expect(res.status).toBe(409);
  expect(await res.json()).toEqual({ error: 'no_profile' });
  expect((await alice('/v1/decks', 'POST', { topic: '' })).status).toBe(400);
  expect((await alice('/v1/decks', 'POST', { topic: 'x'.repeat(81) })).status).toBe(400);
});

test('generate: 10 cards in order at stage 0; again returns the same cards; read returns them', async () => {
  const { id } = (await (await alice('/v1/decks', 'POST', { topic: 'Ordering food' })).json()) as Deck;
  const res = await alice(`/v1/decks/${id}/generate`, 'POST');
  expect(res.status).toBe(200);
  const deck = (await res.json()) as Deck;
  expect(deck.status).toBe('ready');
  expect(deck.cards).toHaveLength(10);
  expect(deck.cards.map((c) => c.position)).toEqual([0, 1, 2, 3, 4, 5, 6, 7, 8, 9]);
  for (const c of deck.cards) {
    expect(c.stage).toBe(0);
    for (const field of [c.word, c.translation, c.example, c.exampleTranslation]) expect(field.length).toBeGreaterThan(0);
  }
  const again = (await (await alice(`/v1/decks/${id}/generate`, 'POST')).json()) as Deck;
  expect(again.cards.map((c) => c.id)).toEqual(deck.cards.map((c) => c.id));
  expect(await (await alice(`/v1/decks/${id}`)).json()).toEqual(deck);
});

test('AI fails → 502, the deck stays proposed with no cards', async () => {
  const { id } = (await (await alice('/v1/decks', 'POST', { topic: 'Ordering food' })).json()) as Deck;
  maker = { ...fixtureDeckMaker, cards: async () => Promise.reject(new Error('model down')) };
  const res = await alice(`/v1/decks/${id}/generate`, 'POST');
  expect(res.status).toBe(502);
  expect(await res.json()).toEqual({ error: 'generation_failed' });
  maker = { ...fixtureDeckMaker, cards: async (input) => (await fixtureDeckMaker.cards(input)).slice(0, 7) };
  expect((await alice(`/v1/decks/${id}/generate`, 'POST')).status).toBe(502);
  expect(((await (await alice(`/v1/decks/${id}`)).json()) as Deck)).toMatchObject({ status: 'proposed', cards: [] });
});

test('decks are private: another user or an unknown id gets 404', async () => {
  const { id } = (await (await alice('/v1/decks', 'POST', { topic: 'Ordering food' })).json()) as Deck;
  expect((await bob(`/v1/decks/${id}`)).status).toBe(404);
  expect((await bob(`/v1/decks/${id}/generate`, 'POST')).status).toBe(404);
  expect((await alice(`/v1/decks/${crypto.randomUUID()}`)).status).toBe(404);
  expect((await alice('/v1/decks/not-a-uuid')).status).toBe(404);
  expect(decks.get(id)!.status).toBe('proposed');
});

test('claudeDeckMaker: sends the key, reads JSON from the answer, refuses a bad answer', async () => {
  const cards = await fixtureDeckMaker.cards({ ...profile, topic: 'Ordering food', cefr: 'A2+' });
  const calls: { url: string; headers: Record<string, string>; body: { model: string; messages: { content: string }[] } }[] = [];
  const fakeFetch = (text: string, ok = true) =>
    (async (url: string, init: RequestInit) => {
      calls.push({ url, headers: init.headers as Record<string, string>, body: JSON.parse(String(init.body)) });
      return new Response(JSON.stringify({ content: [{ type: 'text', text }] }), { status: ok ? 200 : 500 });
    }) as unknown as typeof fetch;
  const input = { ...profile, topic: 'Ordering food', cefr: 'A2+' };

  const good = claudeDeckMaker('sk-test', fakeFetch('Here you go:\n```json\n' + JSON.stringify({ cards }) + '\n```'));
  expect(await good.cards(input)).toEqual(cards);
  expect(calls[0]!.url).toBe('https://api.anthropic.com/v1/messages');
  expect(calls[0]!.headers['x-api-key']).toBe('sk-test');
  expect(calls[0]!.body.messages[0]!.content).toContain('Ordering food');

  expect(await claudeDeckMaker('k', fakeFetch(JSON.stringify({ title: 'Order food', reason: 'For your trip' }))).propose(input)).toEqual({ title: 'Order food', reason: 'For your trip' });
  await expect(claudeDeckMaker('k', fakeFetch(JSON.stringify({ cards: cards.slice(0, 3) }))).cards(input)).rejects.toThrow();
  await expect(claudeDeckMaker('k', fakeFetch('not json')).cards(input)).rejects.toThrow();
  await expect(claudeDeckMaker('k', fakeFetch('{}', false)).cards(input)).rejects.toThrow();
});
