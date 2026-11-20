import { beforeAll, beforeEach, expect, test } from 'vitest';

import { createApp, type CardsStore, type ReviewCard, type UsersStore } from '../../src/app.js';
import { claudeUseItJudge } from '../../src/llm/claude.js';
import { fixtureUseItJudge } from '../../src/llm/fixture.js';
import type { UseItJudge } from '../../src/llm/use-it.js';
import { applySwipe, pickRound } from '../../src/review/srs.js';
import { ISSUER, makeTestKeys } from '../helpers/tokens.js';

const now = new Date('2026-11-16T10:00:00Z');
const days = (n: number) => new Date(now.getTime() + n * 86_400_000);
const fresh = { stage: 0, known: false, hard: false, dueAt: null as Date | null };

// Rule change 2026-11-20 (review-srs-rules): Easy on a new card gives stage 2, and a hard word stays hard until stage 3.
test('Easy: a new card goes to stage 2, others up one stage, back in 3 / 7 / 14 / 30 days, top stage stays 5, clears hard at stage 3', () => {
  expect([0, 1, 2, 3, 4, 5].map((stage) => applySwipe({ ...fresh, stage }, 'easy', now))).toEqual([
    { stage: 2, known: false, hard: false, dueAt: days(3), backInDays: 3 },
    { stage: 2, known: false, hard: false, dueAt: days(3), backInDays: 3 },
    { stage: 3, known: false, hard: false, dueAt: days(7), backInDays: 7 },
    { stage: 4, known: false, hard: false, dueAt: days(14), backInDays: 14 },
    { stage: 5, known: false, hard: false, dueAt: days(30), backInDays: 30 },
    { stage: 5, known: false, hard: false, dueAt: days(30), backInDays: 30 },
  ]);
  expect(applySwipe({ ...fresh, stage: 2, hard: true }, 'easy', now).hard).toBe(false);
});

test('Hard: stage 1, tomorrow, marked hard', () => {
  expect(applySwipe({ ...fresh, stage: 4 }, 'hard', now)).toEqual({ stage: 1, known: false, hard: true, dueAt: days(1), backInDays: 1 });
});

test('I know it: known, not hard, no due date', () => {
  expect(applySwipe({ ...fresh, stage: 2, hard: true, dueAt: days(1) }, 'known', now)).toEqual({ stage: 2, known: true, hard: false, dueAt: null, backInDays: null });
});

test('round: due cards first (oldest due first), then new cards in order, 20 new at most; known and not-yet-due cards are left out', () => {
  const card = (id: string, over: Partial<typeof fresh> & { deckCreatedAt?: Date; position?: number }) => ({ id, ...fresh, deckCreatedAt: now, position: 0, ...over });
  const cards = [
    card('new-b', { deckCreatedAt: days(-1), position: 1 }),
    card('new-a', { deckCreatedAt: days(-1), position: 0 }),
    card('new-old-deck', { deckCreatedAt: days(-5) }),
    card('due-late', { stage: 2, dueAt: days(-1) }),
    card('due-early', { stage: 1, dueAt: days(-3) }),
    card('later', { stage: 1, dueAt: days(2) }),
    card('known', { known: true }),
    ...Array.from({ length: 30 }, (_, i) => card(`bulk-${String(i).padStart(2, '0')}`, { deckCreatedAt: days(0), position: i })),
  ];
  const ids = pickRound(cards, now).map((c) => c.id);
  expect(ids.slice(0, 5)).toEqual(['due-early', 'due-late', 'new-old-deck', 'new-a', 'new-b']);
  expect(ids).toHaveLength(2 + 20);
  expect(ids).not.toContain('later');
  expect(ids).not.toContain('known');
});

// Routes
type Row = ReviewCard & { userId: string; known: boolean; hard: boolean; dueAt: Date | null };
let t: Awaited<ReturnType<typeof makeTestKeys>>;
let rows: Row[];
let judge: UseItJudge;
const users: UsersStore = { upsert: async (id, isGuest) => ({ id, isGuest, createdAt: new Date() }) };
const cardsStore: CardsStore = {
  round: async (userId) => rows.filter((r) => r.userId === userId && !r.known && (r.stage === 0 || (r.dueAt !== null && r.dueAt <= new Date()))),
  get: async (userId, id) => rows.find((r) => r.userId === userId && r.id === id) ?? null,
  save: async (id, patch) => void Object.assign(rows.find((r) => r.id === id)!, patch),
  hardWords: async (userId) => rows.filter((r) => r.userId === userId && r.hard && !r.known).map(({ word, translation }) => ({ word, translation })),
  languages: async () => ({ learningLanguage: 'es', nativeLanguage: 'en' }),
};
let alice: (path: string, method?: string, body?: unknown) => Promise<Response>;
let bob: typeof alice;
const A = '11111111-1111-4111-8111-111111111111';

beforeAll(async () => {
  t = await makeTestKeys();
});
beforeEach(async () => {
  const [a, b] = [crypto.randomUUID(), crypto.randomUUID()];
  judge = fixtureUseItJudge;
  rows = [{ id: A, userId: a, deckId: 'd', deckTopic: 'Ordering food', word: 'la propina', translation: 'the tip', example: 'e', exampleTranslation: 't', stage: 0, known: false, hard: false, dueAt: null }];
  const as = (token: string): typeof alice => (path, method = 'GET', body) =>
    Promise.resolve(createApp({ keys: t.keys, issuer: ISSUER, users, cards: cardsStore, useItJudge: judge }).request(path, { method, headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' }, body: body === undefined ? undefined : JSON.stringify(body) }));
  alice = as(await t.token({ sub: a }));
  bob = as(await t.token({ sub: b }));
});

test('GET /v1/review lists my cards without server-only fields', async () => {
  const body = (await (await alice('/v1/review')).json()) as { cards: Record<string, unknown>[] };
  expect(body.cards).toEqual([{ id: A, deckId: 'd', deckTopic: 'Ordering food', word: 'la propina', translation: 'the tip', example: 'e', exampleTranslation: 't', stage: 0 }]);
  expect(((await (await bob('/v1/review')).json()) as { cards: unknown[] }).cards).toEqual([]);
});

test('swipe easy / hard / known; then the card leaves the round; hard words list', async () => {
  const easy = await alice(`/v1/cards/${A}/swipe`, 'POST', { direction: 'easy' });
  expect(easy.status).toBe(200);
  expect(await easy.json()).toEqual({ id: A, stage: 2, known: false, hard: false, backInDays: 3, again: false });
  expect(((await (await alice('/v1/review')).json()) as { cards: unknown[] }).cards).toEqual([]);

  expect(await (await alice(`/v1/cards/${A}/swipe`, 'POST', { direction: 'hard' })).json()).toMatchObject({ stage: 1, hard: true, backInDays: 1 });
  expect(await (await alice('/v1/hard-words')).json()).toEqual({ words: [{ word: 'la propina', translation: 'the tip' }] });

  expect(await (await alice(`/v1/cards/${A}/swipe`, 'POST', { direction: 'known' })).json()).toMatchObject({ known: true, hard: false, backInDays: null });
  expect(await (await alice('/v1/hard-words')).json()).toEqual({ words: [] });
});

test('swipe: another user, unknown id → 404; bad direction → 400; nothing changes', async () => {
  expect((await bob(`/v1/cards/${A}/swipe`, 'POST', { direction: 'easy' })).status).toBe(404);
  expect((await alice(`/v1/cards/${crypto.randomUUID()}/swipe`, 'POST', { direction: 'easy' })).status).toBe(404);
  expect((await alice('/v1/cards/nope/swipe', 'POST', { direction: 'easy' })).status).toBe(404);
  expect((await alice(`/v1/cards/${A}/swipe`, 'POST', { direction: 'sideways' })).status).toBe(400);
  expect(rows[0]).toMatchObject({ stage: 0, known: false, hard: false });
});

test('use it: a good sentence moves the word up; a weak one does not; a failed check changes nothing', async () => {
  rows[0]!.stage = 1;
  const good = await alice(`/v1/cards/${A}/use-it`, 'POST', { sentence: 'Dejé propina al mesero porque fue amable.' });
  expect(good.status).toBe(200);
  const body = (await good.json()) as { good: boolean; lines: string[]; movedUp: boolean; stage: number };
  expect(body).toMatchObject({ good: true, movedUp: true, stage: 2 });
  expect(body.lines.length).toBeGreaterThanOrEqual(1);
  expect(body.lines.length).toBeLessThanOrEqual(4);

  expect(await (await alice(`/v1/cards/${A}/use-it`, 'POST', { sentence: 'Me gusta el café.' })).json()).toMatchObject({ good: false, movedUp: false, stage: 2 });

  rows[0]!.stage = 5;
  expect(await (await alice(`/v1/cards/${A}/use-it`, 'POST', { sentence: 'La propina es buena.' })).json()).toMatchObject({ good: true, movedUp: false, stage: 5 });

  judge = { check: async () => Promise.reject(new Error('model down')) };
  const failed = await alice(`/v1/cards/${A}/use-it`, 'POST', { sentence: 'La propina.' });
  expect(failed.status).toBe(502);
  expect(await failed.json()).toEqual({ error: 'check_failed' });
  expect(rows[0]!.stage).toBe(5);

  expect((await bob(`/v1/cards/${A}/use-it`, 'POST', { sentence: 'La propina.' })).status).toBe(404);
  expect((await alice(`/v1/cards/${A}/use-it`, 'POST', { sentence: '' })).status).toBe(400);
});

test('claudeUseItJudge reads { good, lines } and refuses a bad answer', async () => {
  const fakeFetch = (text: string) => (async () => new Response(JSON.stringify({ content: [{ type: 'text', text }] }), { status: 200 })) as unknown as typeof fetch;
  const input = { word: 'la propina', translation: 'the tip', sentence: 'Dejé propina.', learningLanguage: 'es', nativeLanguage: 'en' };
  expect(await claudeUseItJudge('k', fakeFetch('{"good": true, "lines": ["🎉 **Great sentence!**"]}')).check(input)).toEqual({ good: true, lines: ['🎉 **Great sentence!**'] });
  await expect(claudeUseItJudge('k', fakeFetch('{"good": "yes"}')).check(input)).rejects.toThrow();
});
