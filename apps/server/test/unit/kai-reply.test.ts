import { beforeAll, expect, test } from 'vitest';

import { createApp, type ProfilesStore, type UsersStore } from '../../src/app.js';
import { claudeKaiReplier } from '../../src/llm/claude.js';
import { fixtureKaiReplier } from '../../src/llm/fixture.js';
import type { KaiReplier } from '../../src/llm/kai-reply.js';
import type { Profile } from '../../src/onboarding/profile.js';
import { ISSUER, makeTestKeys } from '../helpers/tokens.js';

const profile: Profile & { name?: string } = { learningLanguage: 'es', nativeLanguage: 'en', level: 'some_basics', knownWords: null, cefr: 'A2', goal: 'travel', goalOther: null, interests: ['food'], name: 'Maya' };
let t: Awaited<ReturnType<typeof makeTestKeys>>;
const users: UsersStore = { upsert: async (id, isGuest) => ({ id, isGuest, createdAt: new Date() }) };

beforeAll(async () => {
  t = await makeTestKeys();
});

async function ask(body: unknown, opts: { replier?: KaiReplier; profile?: typeof profile | null } = {}) {
  const profiles = { get: async () => (opts.profile === undefined ? profile : opts.profile) } as unknown as ProfilesStore;
  const app = createApp({ keys: t.keys, issuer: ISSUER, users, profiles, kaiReplier: opts.replier ?? fixtureKaiReplier });
  const res = await app.request('/v1/kai/reply', { method: 'POST', headers: { Authorization: `Bearer ${await t.token()}`, 'content-type': 'application/json' }, body: JSON.stringify(body) });
  return { status: res.status, body: (await res.json()) as Record<string, unknown> };
}

test('a name in a sentence', async () => {
  expect(await ask({ step: 'name', text: "I'm Maya" })).toEqual({ status: 200, body: { onScript: true, answer: 'Maya' } });
});

test('a question instead of a name → 1–2 short lines', async () => {
  const { status, body } = await ask({ step: 'name', text: 'Why do you need my name?' });
  expect(status).toBe(200);
  expect(body.onScript).toBe(false);
  const lines = body.lines as string[];
  expect(lines.length).toBeGreaterThanOrEqual(1);
  expect(lines.length).toBeLessThanOrEqual(2);
  for (const l of lines) expect(l.length).toBeLessThanOrEqual(160);
});

test('language by words', async () => {
  expect(await ask({ step: 'language', text: 'english please', options: ['English', 'Español'] })).toEqual({ status: 200, body: { onScript: true, answer: 'native' } });
  expect(await ask({ step: 'language', text: 'in español', options: ['English', 'Español'] })).toEqual({ status: 200, body: { onScript: true, answer: 'target' } });
});

test('while the deck is made, every text is off the script', async () => {
  for (const step of ['proposed', 'generating']) expect((await ask({ step, text: 'Maya' })).body.onScript).toBe(false);
});

test('an on-script answer that does not fit the step is refused (502)', async () => {
  const bad: KaiReplier = { reply: async () => ({ onScript: true, answer: 'french' }) };
  expect(await ask({ step: 'language', text: 'french', options: ['English', 'Español'] }, { replier: bad })).toEqual({ status: 502, body: { error: 'kai_unavailable' } });
  const always: KaiReplier = { reply: async () => ({ onScript: true, answer: 'ok' }) };
  expect((await ask({ step: 'generating', text: 'ok' }, { replier: always })).status).toBe(502);
});

test('bad input → 400', async () => {
  expect((await ask({ step: 'dance', text: 'hi' })).status).toBe(400);
  expect((await ask({ step: 'name', text: '' })).status).toBe(400);
  expect((await ask({ step: 'name', text: 'x'.repeat(201) })).status).toBe(400);
  expect((await ask({ step: 'name', text: 'hi', options: ['a', 'b', 'c', 'd', 'e', 'f', 'g'] })).status).toBe(400);
});

test('AI fails → 502 kai_unavailable', async () => {
  const broken: KaiReplier = { reply: async () => { throw new Error('down'); } };
  expect(await ask({ step: 'name', text: 'Maya' }, { replier: broken })).toEqual({ status: 502, body: { error: 'kai_unavailable' } });
});

test('no profile still answers', async () => {
  expect((await ask({ step: 'name', text: 'Maya' }, { profile: null })).status).toBe(200);
});

test('the replier gets the learner', async () => {
  let got: unknown;
  const spy: KaiReplier = { reply: async (i) => ((got = i), { onScript: true, answer: 'Maya' }) };
  await ask({ step: 'name', text: 'Maya', options: [] }, { replier: spy });
  expect(got).toMatchObject({ step: 'name', text: 'Maya', options: [], learningLanguage: 'es', nativeLanguage: 'en', name: 'Maya' });
});

test('claudeKaiReplier: Haiku 5.5, JSON schema, reads both kinds of answer, refuses bad JSON', async () => {
  const calls: { body: { model: string; output_config: { format: { type: string } } } }[] = [];
  const fake = (text: string, ok = true) =>
    (async (_url: string, init: RequestInit) => {
      calls.push({ body: JSON.parse(String(init.body)) });
      return new Response(JSON.stringify({ stop_reason: 'end_turn', content: [{ type: 'text', text }] }), { status: ok ? 200 : 500 });
    }) as unknown as typeof fetch;
  const input = { step: 'name' as const, text: 'Why?', options: [], learningLanguage: 'es', nativeLanguage: 'en', name: null };
  expect(await claudeKaiReplier('k', fake(JSON.stringify({ onScript: false, answer: '', lines: ['😊 So I can **greet** you!'] }))).reply(input)).toEqual({ onScript: false, lines: ['😊 So I can **greet** you!'] });
  expect(calls[0]!.body.model).toBe('claude-haiku-5-5');
  expect(calls[0]!.body.output_config.format.type).toBe('json_schema');
  expect(await claudeKaiReplier('k', fake(JSON.stringify({ onScript: true, answer: 'Maya', lines: [] }))).reply(input)).toEqual({ onScript: true, answer: 'Maya' });
  await expect(claudeKaiReplier('k', fake('nope')).reply(input)).rejects.toThrow();
  await expect(claudeKaiReplier('k', fake('{}', false)).reply(input)).rejects.toThrow();
});
