import { beforeAll, beforeEach, expect, test } from 'vitest';

import { createApp, type UsersStore } from '../../src/app.js';
import { claudeLanguageChecker } from '../../src/llm/claude.js';
import { fixtureLanguageChecker, type LanguageChecker } from '../../src/llm/check-language.js';
import { LANGUAGES } from '../../src/onboarding/languages.js';
import { ISSUER, makeTestKeys } from '../helpers/tokens.js';

const users: UsersStore = { upsert: async (id, isGuest) => ({ id, isGuest, createdAt: new Date() }) };
let token: string;
let calls: string[];
let answer: Awaited<ReturnType<LanguageChecker['check']>> | Error;
const checker: LanguageChecker = {
  check: async (text) => {
    calls.push(text);
    if (answer instanceof Error) throw answer;
    return answer;
  },
};
let app: ReturnType<typeof createApp>;

beforeAll(async () => {
  const t = await makeTestKeys();
  token = await t.token();
  app = createApp({ keys: t.keys, issuer: ISSUER, users, languageChecker: checker });
});
beforeEach(() => {
  calls = [];
  answer = new Error('not set');
});

const check = (body: unknown, auth = true) =>
  app.request('/v1/languages/check', {
    method: 'POST',
    body: JSON.stringify(body),
    headers: { 'Content-Type': 'application/json', ...(auth ? { Authorization: `Bearer ${token}` } : {}) },
  });

test('the 13 listed languages, in order', () => {
  expect(LANGUAGES.map((l) => l.code)).toEqual(['en', 'es', 'fr', 'de', 'it', 'pt', 'ru', 'ar', 'fa', 'tr', 'ja', 'zh', 'ko']);
});

test('a listed name or code is a match without the AI', async () => {
  for (const name of [' Spanish ', 'spanish', 'ES']) {
    const res = await check({ name });
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ result: 'match', language: { code: 'es', name: 'Spanish', listed: true } });
  }
  expect(calls).toEqual([]);
});

test('a real language spelled right is a match', async () => {
  answer = { isLanguage: true, name: 'Swedish', code: 'sv' };
  expect(await (await check({ name: 'swedish' })).json()).toEqual({ result: 'match', language: { code: 'sv', name: 'Swedish', listed: false } });
  expect(calls).toEqual(['swedish']);
});

test('a misspelling is a suggestion, with the listed name for a listed language', async () => {
  answer = { isLanguage: true, name: 'spanish language', code: 'ES' };
  expect(await (await check({ name: 'spansh' })).json()).toEqual({ result: 'suggestion', language: { code: 'es', name: 'Spanish', listed: true } });
});

test('a native name is a suggestion', async () => {
  answer = { isLanguage: true, name: 'Swedish', code: 'sv' };
  expect(await (await check({ name: 'Svenska' })).json()).toEqual({ result: 'suggestion', language: { code: 'sv', name: 'Swedish', listed: false } });
});

test('not a language is unknown', async () => {
  answer = { isLanguage: false, name: null, code: null };
  expect(await (await check({ name: 'qwzx' })).json()).toEqual({ result: 'unknown', language: null });
});

test('a failed AI call is a 502', async () => {
  answer = new Error('timeout');
  const res = await check({ name: 'qwzx' });
  expect(res.status).toBe(502);
  expect(await res.json()).toEqual({ error: 'check_failed' });
});

test('a language answer with no name or code is a 502', async () => {
  answer = { isLanguage: true, name: null, code: null };
  expect((await check({ name: 'qwzx' })).status).toBe(502);
});

test('bad body is a 400', async () => {
  for (const body of [{}, { name: '' }, { name: '   ' }, { name: 'x'.repeat(41) }]) expect((await check(body)).status).toBe(400);
});

test('no token is a 401', async () => {
  expect((await check({ name: 'Swedish' }, false)).status).toBe(401);
});

test('the fixture knows a misspelling, real languages and nonsense', async () => {
  expect(await fixtureLanguageChecker.check('spansh')).toEqual({ isLanguage: true, name: 'Spanish', code: 'es' });
  expect(await fixtureLanguageChecker.check('Swedish')).toEqual({ isLanguage: true, name: 'Swedish', code: 'sv' });
  expect(await fixtureLanguageChecker.check('qwzx')).toEqual({ isLanguage: false, name: null, code: null });
});

test('the real checker sends the text and reads the JSON answer', async () => {
  let sent = '';
  const fakeFetch = (async (_url: string, init: RequestInit) => {
    sent = String(init.body);
    return new Response(JSON.stringify({ content: [{ type: 'text', text: 'Here: {"isLanguage": true, "name": "Swedish", "code": "sv"}' }] }));
  }) as unknown as typeof fetch;
  expect(await claudeLanguageChecker('key', fakeFetch).check('svenska')).toEqual({ isLanguage: true, name: 'Swedish', code: 'sv' });
  expect(sent).toContain('svenska');
});
