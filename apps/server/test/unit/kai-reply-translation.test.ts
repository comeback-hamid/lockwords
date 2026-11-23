import { beforeAll, expect, test } from 'vitest';

import { createApp, type ProfilesStore, type UsersStore } from '../../src/app.js';
import { claudeKaiReplier } from '../../src/llm/claude.js';
import { fixtureKaiReplier } from '../../src/llm/fixture.js';
import { checkReply, type KaiReplier, type KaiReplyInput } from '../../src/llm/kai-reply.js';
import type { Profile } from '../../src/onboarding/profile.js';
import { ISSUER, makeTestKeys } from '../helpers/tokens.js';

// Kai's own lines in the onboarding chat (an answer to typed text) are in the chat's language, and when that is the
// learned language each line comes with its translation into the learner's own language.

const profile: Profile = { learningLanguage: 'es', nativeLanguage: 'fa', level: 'some_basics', knownWords: null, cefr: 'A2', goal: 'travel', goalOther: null, interests: ['food'] };
let t: Awaited<ReturnType<typeof makeTestKeys>>;
const users: UsersStore = { upsert: async (id, isGuest) => ({ id, isGuest, createdAt: new Date() }) };
beforeAll(async () => {
  t = await makeTestKeys();
});

async function ask(body: unknown, replier: KaiReplier = fixtureKaiReplier) {
  const profiles = { get: async () => profile } as unknown as ProfilesStore;
  const app = createApp({ keys: t.keys, issuer: ISSUER, users, profiles, kaiReplier: replier });
  const res = await app.request('/v1/kai/reply', { method: 'POST', headers: { Authorization: `Bearer ${await t.token()}`, 'content-type': 'application/json' }, body: JSON.stringify(body) });
  return { status: res.status, body: (await res.json()) as Record<string, unknown> };
}

test('the replier is told which language the chat is in; no "chat" means the learner’s own language', async () => {
  const got: KaiReplyInput[] = [];
  const spy: KaiReplier = { reply: async (i) => (got.push(i), { onScript: false, lines: ['😊 Hola'] }) };
  await ask({ step: 'topic', text: 'why?', chat: 'target' }, spy);
  await ask({ step: 'topic', text: 'why?' }, spy);
  expect(got.map((i) => i.chat)).toEqual(['target', 'native']);
  expect((await ask({ step: 'topic', text: 'why?', chat: 'klingon' }, spy)).status).toBe(400);
});

test('lines in the learned language come back with one translation each', async () => {
  const replier: KaiReplier = { reply: async () => ({ onScript: false, lines: ['😊 Hago **tarjetas**.', '✨ Contigo.'], translations: ['😊 کارت می‌سازم.', '✨ با تو.'] }) };
  expect(await ask({ step: 'topic', text: '¿Qué haces?', chat: 'target' }, replier)).toEqual({
    status: 200,
    body: { onScript: false, lines: ['😊 Hago **tarjetas**.', '✨ Contigo.'], translations: ['😊 کارت می‌سازم.', '✨ با تو.'] },
  });
});

test('translations are plain text, and a list that does not fit the lines is dropped, never the lines', () => {
  expect(checkReply('topic', { onScript: false, lines: ['a', 'b'], translations: ['**x** ', ' y'] })).toEqual({ onScript: false, lines: ['a', 'b'], translations: ['x', 'y'] });
  expect(checkReply('topic', { onScript: false, lines: ['a', 'b'], translations: ['x'] })).toEqual({ onScript: false, lines: ['a', 'b'] });
  expect(checkReply('topic', { onScript: false, lines: ['a'], translations: [''] })).toEqual({ onScript: false, lines: ['a'] });
  expect(checkReply('topic', { onScript: false, lines: ['a'], translations: 'x' })).toEqual({ onScript: false, lines: ['a'] });
  expect(checkReply('topic', { onScript: false, lines: ['a'] })).toEqual({ onScript: false, lines: ['a'] });
});

test('the stand-in gives a translation for every line when the chat is in the learned language', async () => {
  const { body } = await ask({ step: 'name', text: 'Why do you need my name?', chat: 'target' });
  expect(body.onScript).toBe(false);
  expect((body.translations as string[]).length).toBe((body.lines as string[]).length);
  expect((await ask({ step: 'name', text: 'Why do you need my name?' })).body.translations).toBeUndefined();
});

test('claudeKaiReplier: writes in the chat’s language and asks for translations only for the learned language', async () => {
  const calls: { system: string; messages: { content: string }[]; output_config: { format: { schema: { properties: Record<string, unknown> } } } }[] = [];
  const fake = (text: string) =>
    (async (_url: string, init: RequestInit) => {
      calls.push(JSON.parse(String(init.body)));
      return new Response(JSON.stringify({ stop_reason: 'end_turn', content: [{ type: 'text', text }] }), { status: 200 });
    }) as unknown as typeof fetch;
  const input = { step: 'topic' as const, text: '¿Qué haces?', options: [], learningLanguage: 'Spanish', nativeLanguage: 'Persian', name: null };

  const target = await claudeKaiReplier('k', fake(JSON.stringify({ onScript: false, answer: '', lines: ['😊 Hago **tarjetas**.'], translations: ['😊 کارت می‌سازم.'] }))).reply({ ...input, chat: 'target' });
  expect(target).toEqual({ onScript: false, lines: ['😊 Hago **tarjetas**.'], translations: ['😊 کارت می‌سازم.'] });
  const asked = calls[0]!.system + calls[0]!.messages[0]!.content;
  expect(asked).toContain('in Spanish');
  expect(asked).toContain('"translations"');
  expect(asked).toContain('Persian');
  expect(asked).not.toContain('in English');
  expect(calls[0]!.output_config.format.schema.properties).toHaveProperty('translations');

  const native = await claudeKaiReplier('k', fake(JSON.stringify({ onScript: false, answer: '', lines: ['😊 کارت می‌سازم.'], translations: [] }))).reply({ ...input, chat: 'native' });
  expect(native).toEqual({ onScript: false, lines: ['😊 کارت می‌سازم.'] });
  expect(calls[1]!.system + calls[1]!.messages[0]!.content).toContain('in Persian');
});
