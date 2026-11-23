import { expect, test } from 'vitest';

import type { DecksStore, ProfilesStore } from '../../src/app.js';
import { readyEvent } from '../../src/kai/abilities/decks.js';
import { kaiTurn, type KaiStore, type KaiTurnToSave } from '../../src/kai/chat.js';
import { ENGLISH_SCRIPT, goodScript } from '../../src/kai/script.js';
import { fixtureKaiReplier } from '../../src/llm/fixture.js';
import { buildKaiPrompt, fixtureKaiChat, KaiAnswerSchema, type KaiChat, type KaiContext } from '../../src/llm/kai-chat.js';
import { checkReply, KAI_STEPS } from '../../src/llm/kai-reply.js';
import type { Profile } from '../../src/onboarding/profile.js';

// Kai and the deck's pictures: while they are drawn Kai says so and invites the learner to use the wait;
// when they are done (or failed) Kai says it once.
const ctx = (over: Partial<KaiContext> = {}): KaiContext => ({
  name: 'Maya', learningLanguage: 'Spanish', nativeLanguage: 'English', cefr: 'A2', knownWords: 600, goal: 'travel', goalOther: null, interests: ['food'], notes: [], history: [],
  words: { total: 0, reviewedLastDay: 0, dueNow: 0, sample: [] }, opening: false, firstVisit: false, userText: null, ...over,
});
const deck = { title: 'Pedir comida', wordCount: 24 };

test('words ready, pictures being made: Kai says both and invites the learner to use the wait', () => {
  const p = buildKaiPrompt(ctx({ event: { deckReady: { ...deck, pictures: 'making' } } })).user;
  expect(p).toContain('Pedir comida');
  expect(p).toContain('You are drawing a picture for each of its 24 words right now');
  expect(p).toContain('about half a minute');
  expect(p).toContain('ask you a language question');
  expect(p).toContain('practice');
  expect(p).toContain('correct a sentence');
  expect(p).toContain('something about you');
  expect(p).toContain('The card under your lines shows how many pictures are ready');
  expect(p).not.toContain('Give exactly two options: one to practice now, one to make another deck');
});

test('no pictures coming (none, or already there): the old "ready" lines', () => {
  for (const pictures of [undefined, 'none', 'ready'] as const) {
    const p = buildKaiPrompt(ctx({ event: { deckReady: { ...deck, ...(pictures ? { pictures } : {}) } } })).user;
    expect(p).toContain('Give exactly two options: one to practice now, one to make another deck');
    expect(p).not.toContain('drawing a picture');
  }
});

test('the pictures event: ready → Kai says the pictures are done and the deck can be opened; failed → the deck works without them', () => {
  const done = buildKaiPrompt(ctx({ event: { deckReady: { ...deck, pictures: 'ready', about: 'pictures' } } })).user;
  expect(done).toContain('All 24 pictures of the deck "Pedir comida" are ready now');
  expect(done).toContain('can open the deck');
  expect(done).toContain('Give exactly two options: one to practice now, one to make another deck');
  const failed = buildKaiPrompt(ctx({ event: { deckReady: { ...deck, pictures: 'failed', about: 'pictures' } } })).user;
  expect(failed).toContain('could not draw the pictures');
  expect(failed).toContain('works without pictures');
});

test('the stand-in Kai speaks for each case, in the answer shape', async () => {
  for (const event of [{ deckReady: { ...deck, pictures: 'making' as const } }, { deckReady: { ...deck, pictures: 'ready' as const, about: 'pictures' as const } }, { deckReady: { ...deck, pictures: 'failed' as const, about: 'pictures' as const } }]) {
    const answer = KaiAnswerSchema.parse(await fixtureKaiChat.answer(ctx({ event }), Date.now() + 1000));
    expect(answer.lines.length).toBeGreaterThan(0);
    expect(answer.options!.length).toBeGreaterThanOrEqual(2);
  }
  const making = KaiAnswerSchema.parse(await fixtureKaiChat.answer(ctx({ event: { deckReady: { ...deck, pictures: 'making' } } }), Date.now() + 1000));
  expect(making.lines.map((l) => l.translation).join(' ')).toMatch(/drawing/i);
});

// ---- the event itself ----
type Row = { status: string; picturesStatus?: string };
const deps = (row: Row | null, said: { ready?: boolean; pictures?: boolean } = {}) => ({
  decks: { get: async () => (row ? { id: 'd', title: 'Pedir comida', reason: 'r', cefr: 'A2', wordCount: 24, ...row } : null) },
  kai: { saidReady: async () => !!said.ready, saidPictures: async () => !!said.pictures },
});
const ID = crypto.randomUUID();

test('deck_ready carries the pictures state', async () => {
  expect(await readyEvent(deps({ status: 'ready', picturesStatus: 'making' }), 'u', ID)).toEqual({ title: 'Pedir comida', wordCount: 24, pictures: 'making' });
  expect(await readyEvent(deps({ status: 'ready' }), 'u', ID)).toEqual({ title: 'Pedir comida', wordCount: 24, pictures: 'none' });
});

test('deck_pictures: only for a ready deck whose picture run ended, and once', async () => {
  expect(await readyEvent(deps({ status: 'ready', picturesStatus: 'ready' }), 'u', ID, 'deck_pictures')).toEqual({ title: 'Pedir comida', wordCount: 24, pictures: 'ready', about: 'pictures' });
  expect(await readyEvent(deps({ status: 'ready', picturesStatus: 'failed' }), 'u', ID, 'deck_pictures')).toMatchObject({ pictures: 'failed', about: 'pictures' });
  expect(await readyEvent(deps({ status: 'ready', picturesStatus: 'making' }), 'u', ID, 'deck_pictures')).toBe('deck_not_ready');
  expect(await readyEvent(deps({ status: 'ready', picturesStatus: 'none' }), 'u', ID, 'deck_pictures')).toBe('deck_not_ready');
  expect(await readyEvent(deps({ status: 'generating' }), 'u', ID, 'deck_pictures')).toBe('deck_not_ready');
  expect(await readyEvent(deps(null), 'u', ID, 'deck_pictures')).toBe('not_found');
  expect(await readyEvent(deps({ status: 'ready', picturesStatus: 'ready' }, { pictures: true }), 'u', ID, 'deck_pictures')).toBe('said');
  // "ready" was said before: the pictures line is still new
  expect(await readyEvent(deps({ status: 'ready', picturesStatus: 'ready' }, { ready: true }), 'u', ID, 'deck_pictures')).toMatchObject({ about: 'pictures' });
});

test('a pictures turn is saved with its own mark, not the "ready" mark', async () => {
  const profile: Profile = { learningLanguage: 'es', nativeLanguage: 'en', level: 'some_basics', knownWords: 600, cefr: 'A2', goal: 'travel', goalOther: null, interests: [] };
  const turns: KaiTurnToSave[] = [];
  const seen: KaiContext[] = [];
  const kai: KaiStore = {
    messages: async () => [], lastOpeningAt: async () => null, userTurnsSince: async () => 0, notes: async () => [],
    facts: async () => ({ name: 'Maya', translationOn: null, words: { total: 0, reviewedLastDay: 0, dueNow: 0, sample: [] } }),
    setTranslation: async () => true, saidReady: async () => true, saidPictures: async () => false,
    addTurn: async (_u, turn) => (turns.push(turn), { userMessage: null, messages: [{ id: 'm', from: 'kai', text: 'x', translation: 'y', options: [], opening: false, createdAt: new Date() }] }),
  };
  const kaiChat: KaiChat = { answer: async (c, deadline) => (seen.push(c), fixtureKaiChat.answer(c, deadline)) };
  const decks = { get: async () => ({ id: ID, title: 'Pedir comida', reason: 'r', cefr: 'A2', wordCount: 24, status: 'ready', picturesStatus: 'ready', cards: [] }) } as unknown as DecksStore;
  const profiles = { get: async () => profile } as unknown as ProfilesStore;
  const result = await kaiTurn({ kai, profiles, kaiChat, decks }, 'u', { event: 'deck_pictures', deckId: ID }, new Date());
  expect(result.ok).toBe(true);
  expect(seen[0]!.event).toEqual({ deckReady: { title: 'Pedir comida', wordCount: 24, pictures: 'ready', about: 'pictures' } });
  expect(turns[0]).toMatchObject({ picturesDeckId: ID });
  expect(turns[0]!.readyDeckId).toBeUndefined();
});

// ---- the onboarding chat ----
test('the onboarding script has the picture lines, with their place holders', () => {
  for (const key of ['wordsReady', 'whileDrawing', 'picturesProgress', 'picturesReady', 'picturesFailed', 'backDrawing']) expect(ENGLISH_SCRIPT[key]).toBeTruthy();
  expect(ENGLISH_SCRIPT.picturesProgress).toContain('{ready}');
  expect(ENGLISH_SCRIPT.picturesProgress).toContain('{total}');
  expect(ENGLISH_SCRIPT.whileDrawing).toMatch(/question/);
  expect(goodScript(Object.fromEntries(Object.entries(ENGLISH_SCRIPT).map(([k, v]) => [k, `فا ${v}`])))).toBe(true);
});

test('typed text while the pictures are drawn is never an on-script answer; the stand-in Kai answers it', async () => {
  expect(KAI_STEPS).toContain('drawing');
  expect(() => checkReply('drawing', { onScript: true, answer: 'x' })).toThrow();
  const reply = await fixtureKaiReplier.reply({ step: 'drawing', text: 'What does "la cuenta" mean?', options: [], learningLanguage: 'es', nativeLanguage: 'en', name: null });
  expect(reply.onScript).toBe(false);
});
