import { expect, test } from 'vitest';

import { buildKaiPrompt, fixtureKaiChat, KaiAnswerSchema, type KaiContext } from '../../src/llm/kai-chat.js';

// Change new-words-polish: Kai takes the learner to Review only when they ask for it (found on the real AI, 2026-11-19:
// a learner with 10 new cards wrote "Hola Kai" and was sent to Review).
const ctx = (over: Partial<KaiContext> = {}): KaiContext => ({
  name: 'Maya',
  learningLanguage: 'Spanish',
  nativeLanguage: 'English',
  cefr: 'A1',
  knownWords: 200,
  goal: 'travel',
  goalOther: null,
  interests: ['food'],
  notes: [],
  history: [],
  words: { total: 10, reviewedLastDay: 0, dueNow: 10, sample: [] },
  opening: false,
  firstVisit: false,
  userText: 'Hola Kai',
  ...over,
});

test('the prompt says when Kai may take the learner to Review, and when not', () => {
  const p = buildKaiPrompt(ctx()).system;
  for (const rule of ['ONLY when', 'clearly asks to practice', 'says yes to your own offer', 'A greeting, small talk or a question is never a reason', 'even when words are due', 'offer practice as a question or as an option']) expect(p).toContain(rule);
});

test('stand-in AI: a greeting gets a normal answer; asking to practice leads to Review', async () => {
  const hello = KaiAnswerSchema.parse(await fixtureKaiChat.answer(ctx(), Date.now() + 1000));
  expect(hello.action).toBeNull();
  const practice = KaiAnswerSchema.parse(await fixtureKaiChat.answer(ctx({ userText: 'Vamos a practicar' }), Date.now() + 1000));
  expect(practice.action).toBe('review');
});
