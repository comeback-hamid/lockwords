import { beforeAll, beforeEach, expect, test, vi } from 'vitest';

import { createApp, type KaiScriptStore, type UsersStore } from '../../src/app.js';
import { ENGLISH_SCRIPT, goodScript, isEnglish, SCRIPT_KEYS } from '../../src/kai/script.js';
import { claudeScriptTranslator } from '../../src/llm/claude.js';
import { fixtureScriptTranslator } from '../../src/llm/fixture.js';
import type { ScriptTranslator } from '../../src/llm/translate-script.js';
import { ISSUER, makeTestKeys } from '../helpers/tokens.js';

const persian = () => Object.fromEntries(SCRIPT_KEYS.map((k) => [k, `فا ${ENGLISH_SCRIPT[k]}`]));

test('the script has Kai’s lines, the tap answers and every deck idea', () => {
  expect(ENGLISH_SCRIPT.askName).toBe('I’ll help you learn **{language}** words. What’s your name?');
  expect(ENGLISH_SCRIPT.replyPractice).toBe('OK, let’s practice!');
  expect(ENGLISH_SCRIPT['idea:Ordering food']).toBe('Ordering food');
  expect(SCRIPT_KEYS.length).toBeGreaterThan(40);
});

test('a translation is good only with every key, its place holders and its bold marks', () => {
  expect(goodScript(persian())).toBe(true);
  const { hi: _hi, ...missing } = persian();
  void _hi;
  expect(goodScript(missing)).toBe(false);
  expect(goodScript({ ...persian(), niceToMeet: 'خوشوقتم! 😊' })).toBe(false); // {name} is gone
  expect(goodScript({ ...persian(), ready: 'آماده است 🎉' })).toBe(false); // the bold marks are gone
  expect(goodScript({ ...persian(), hi: '' })).toBe(false);
  expect(goodScript(null)).toBe(false);
});

test('English is known by code or name', () => {
  expect(['en', 'English', ' english ', 'en-GB'].map(isEnglish)).toEqual([true, true, true, true]);
  expect(['es', 'Persian', 'Swedish'].map(isEnglish)).toEqual([false, false, false]);
});

// The route
let t: Awaited<ReturnType<typeof makeTestKeys>>;
let kept: Map<string, Record<string, string>>;
let translate: ReturnType<typeof vi.fn<ScriptTranslator['translate']>>;
let call: (query: string) => Promise<Response>;
const users: UsersStore = { upsert: async (id, isGuest) => ({ id, isGuest, createdAt: new Date() }) };

beforeAll(async () => {
  t = await makeTestKeys();
});
beforeEach(async () => {
  kept = new Map();
  translate = vi.fn<ScriptTranslator['translate']>(async () => persian());
  const store: KaiScriptStore = { get: async (language) => kept.get(language) ?? null, save: async (language, lines) => void kept.set(language, lines) };
  const app = createApp({ keys: t.keys, issuer: ISSUER, users, kaiScripts: store, scriptTranslator: { translate } });
  const headers = { Authorization: `Bearer ${await t.token()}` };
  call = (query) => Promise.resolve(app.request(`/v1/kai/script?${query}`, { headers }));
});

test('English for both: the built-in script, no AI call', async () => {
  const res = await call('native=en&learning=English');
  expect(res.status).toBe(200);
  expect(await res.json()).toEqual({ native: ENGLISH_SCRIPT, learning: ENGLISH_SCRIPT });
  expect(translate).not.toHaveBeenCalled();
});

test('another language is translated once and kept; the second call makes no AI call', async () => {
  const first = (await (await call('native=Persian&learning=en')).json()) as { native: Record<string, string>; learning: Record<string, string> };
  expect(first.native.hi).toBe('فا Hi! I’m Kai 👋');
  expect(first.learning).toEqual(ENGLISH_SCRIPT);
  expect(translate).toHaveBeenCalledTimes(1);
  expect(translate).toHaveBeenCalledWith('Persian', ENGLISH_SCRIPT);
  await call('native=persian&learning=en'); // the same language, typed another way
  expect(translate).toHaveBeenCalledTimes(1);
});

test('a bad or failed translation: the English script, and nothing is kept', async () => {
  translate.mockResolvedValueOnce({ hi: 'only one line' });
  expect(((await (await call('native=Persian&learning=en')).json()) as { native: unknown }).native).toEqual(ENGLISH_SCRIPT);
  translate.mockRejectedValueOnce(new Error('model down'));
  expect(((await (await call('native=Persian&learning=en')).json()) as { native: unknown }).native).toEqual(ENGLISH_SCRIPT);
  expect(kept.size).toBe(0);
});

test('a missing or too long language name is refused', async () => {
  expect((await call('native=en')).status).toBe(400);
  expect((await call(`native=en&learning=${'x'.repeat(41)}`)).status).toBe(400);
});

test('the stand-in translator returns the English lines; the Claude one reads a JSON map and refuses a bad answer', async () => {
  expect(await fixtureScriptTranslator.translate('Persian', ENGLISH_SCRIPT)).toEqual(ENGLISH_SCRIPT);
  const fakeFetch = (text: string) => (async () => new Response(JSON.stringify({ content: [{ type: 'text', text }] }), { status: 200 })) as unknown as typeof fetch;
  expect(await claudeScriptTranslator('k', fakeFetch(JSON.stringify({ lines: persian() }))).translate('Persian', ENGLISH_SCRIPT)).toEqual(persian());
  await expect(claudeScriptTranslator('k', fakeFetch('{"lines": "no"}')).translate('Persian', ENGLISH_SCRIPT)).rejects.toThrow();
});

test('the app’s built-in English lines are the same as the server’s', async () => {
  const { readFileSync } = await import('node:fs');
  const app = readFileSync(new URL('../../../mobile/src/onboarding/kai-script.ts', import.meta.url), 'utf8');
  const lines = Object.entries(ENGLISH_SCRIPT).filter(([key]) => !key.startsWith('idea:'));
  // The app writes {language} and {name} as template slots.
  const missing = lines.filter(([, text]) => !app.includes(text.replace('{language}', '${language}').replace('{name}', '${name}'))).map(([key]) => key);
  expect(missing).toEqual([]);
});
