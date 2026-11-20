import { beforeAll, beforeEach, expect, test, vi } from 'vitest';

import { createApp, type PlanStore, type ProfilesStore, type ProgressStore, type UsersStore } from '../../src/app.js';
import { claudeDeckPlanner } from '../../src/llm/claude.js';
import { fixtureDeckPlanner } from '../../src/llm/fixture.js';
import { goalWords, openItems, type DeckPlanner, type PlanItem } from '../../src/llm/plan-decks.js';
import type { Profile } from '../../src/onboarding/profile.js';
import { ISSUER, makeTestKeys } from '../helpers/tokens.js';

const item = (topic: string, words = 20): PlanItem => ({ topic, words, kind: 'words + phrases' });
const profile: Profile = { learningLanguage: 'es', nativeLanguage: 'en', level: 'beginner', knownWords: null, cefr: null, goal: 'travel', goalOther: null, interests: ['food'] };

test('open ideas: not the topics the learner has (any case), each topic once', () => {
  expect(openItems([item('Ordering food'), item('At the hotel'), item('at the hotel'), item('Shopping')], ['ordering food']).map((i) => i.topic)).toEqual(['At the hotel', 'Shopping']);
});

test('the goal in words: the learner’s own text for "other"', () => {
  expect(goalWords({ goal: 'travel', goalOther: null })).toBe('travel');
  expect(goalWords({ goal: 'other', goalOther: 'For my grandmother' })).toBe('For my grandmother');
});

test('the stand-in planner: three ideas for the goal that the learner does not have', async () => {
  const { items } = await fixtureDeckPlanner.plan({ ...profile, have: ['Ordering food'] });
  expect(items.map((i) => i.topic)).toEqual(['Getting around the city', 'Meeting new people', 'At the hotel']);
  expect(items.every((i) => i.words >= 10 && i.words <= 30)).toBe(true);
});

// The route
let t: Awaited<ReturnType<typeof makeTestKeys>>;
let kept: { items: PlanItem[]; createdAt: Date } | null;
let have: string[];
let hasProfile: boolean;
let now: Date;
let plan: ReturnType<typeof vi.fn<DeckPlanner['plan']>>;
let call: () => Promise<{ goal: string; items: PlanItem[] }>;
const users: UsersStore = { upsert: async (id, isGuest) => ({ id, isGuest, createdAt: new Date() }) };

beforeAll(async () => {
  t = await makeTestKeys();
});
beforeEach(async () => {
  kept = null;
  have = [];
  hasProfile = true;
  now = new Date('2026-11-20T10:00:00Z');
  plan = vi.fn<DeckPlanner['plan']>(async () => ({ items: [item('A'), item('B'), item('C')] }));
  const profiles = { get: async () => (hasProfile ? profile : null) } as unknown as ProfilesStore;
  const progress = { decks: async () => have.map((topic, i) => ({ id: String(i), topic, title: topic, kind: 'topic' as const, words: [] })) } as unknown as ProgressStore;
  const plans: PlanStore = { get: async () => kept, save: async (_userId, items) => void (kept = { items, createdAt: now }) };
  const app = createApp({ keys: t.keys, issuer: ISSUER, users, profiles, progress, plans, deckPlanner: { plan }, reviewNow: () => now });
  const headers = { Authorization: `Bearer ${await t.token()}` };
  call = async () => (await (await app.request('/v1/plan', { headers })).json()) as { goal: string; items: PlanItem[] };
});

test('first call makes and keeps three ideas; the second call makes no AI call', async () => {
  expect(await call()).toEqual({ goal: 'travel', items: [item('A'), item('B'), item('C')] });
  expect(plan).toHaveBeenCalledWith(expect.objectContaining({ goal: 'travel', have: [] }));
  await call();
  expect(plan).toHaveBeenCalledTimes(1);
});

test('a deck was made for one idea: it leaves the list and a new plan is made', async () => {
  await call();
  have = ['b'];
  plan.mockResolvedValueOnce({ items: [item('A'), item('C'), item('D'), item('B')] });
  expect((await call()).items.map((i) => i.topic)).toEqual(['A', 'C', 'D']); // three at most, and never one they have
  expect(plan).toHaveBeenCalledTimes(2);
});

test('a plan older than 7 days is made again', async () => {
  await call();
  now = new Date('2026-11-28T10:00:00Z');
  await call();
  expect(plan).toHaveBeenCalledTimes(2);
});

test('the AI fails: what is left of the kept plan comes back; with nothing kept the list is empty', async () => {
  plan.mockRejectedValue(new Error('model down'));
  expect(await call()).toEqual({ goal: 'travel', items: [] });
  kept = { items: [item('A'), item('B'), item('C')], createdAt: now };
  have = ['A'];
  expect((await call()).items.map((i) => i.topic)).toEqual(['B', 'C']);
});

test('no profile: an empty plan, no AI call', async () => {
  hasProfile = false;
  expect(await call()).toEqual({ goal: '', items: [] });
  expect(plan).not.toHaveBeenCalled();
});

test('claudeDeckPlanner reads { items } and refuses a bad answer', async () => {
  const fakeFetch = (text: string) => (async () => new Response(JSON.stringify({ content: [{ type: 'text', text }] }), { status: 200 })) as unknown as typeof fetch;
  const input = { ...profile, have: [] };
  expect(await claudeDeckPlanner('k', fakeFetch('{"items": [{"topic": "At the hotel", "words": 20, "kind": "phrases"}]}')).plan(input)).toEqual({ items: [{ topic: 'At the hotel', words: 20, kind: 'phrases' }] });
  await expect(claudeDeckPlanner('k', fakeFetch('{"items": [{"topic": "x", "words": 99, "kind": "phrases"}]}')).plan(input)).rejects.toThrow();
});
