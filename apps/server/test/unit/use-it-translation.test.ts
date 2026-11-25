import { expect, test } from 'vitest';
import { OpenAPIHono } from '@hono/zod-openapi';

import { fixtureUseItJudge, fixtureWordAsker, standInTranslation } from '../../src/llm/fixture.js';
import { claudeUseItJudge, claudeWordAsker } from '../../src/llm/claude.js';
import { ENGLISH_SCRIPT } from '../../src/kai/script.js';
import { kaiRoutes } from '../../src/routes/kai.js';

// Hamid, 2026-11-25: every Kai chat has the translation switch, Use it too. So Kai's Use it lines come in the
// language Kai speaks with this learner, with a translation when that is the language they learn.
const input = { word: 'la propina', translation: 'the tip', sentence: 'Dejé una propina.', learningLanguage: 'Spanish', nativeLanguage: 'Persian' };

test('chat in the learned language: the check and the answer carry one translation per line; chat in the own language: none', async () => {
  const target = await fixtureUseItJudge.check({ ...input, chat: 'target' });
  expect(target.translations).toEqual(target.lines.map(standInTranslation));
  expect((await fixtureUseItJudge.check({ ...input, chat: 'native' })).translations).toBeUndefined();
  const answer = await fixtureWordAsker.ask({ word: 'la propina', translation: 'the tip', question: 'Why?', learningLanguage: 'Spanish', nativeLanguage: 'Persian', chat: 'target' });
  expect(answer.translations).toHaveLength(answer.lines.length);
});

test('the prompts ask for the learned language and its translation only when the chat is in the learned language', async () => {
  const prompts: string[] = [];
  const fake = (async (_url: string, init: RequestInit) => {
    prompts.push(JSON.stringify(JSON.parse(String(init.body)).messages));
    return new Response(JSON.stringify({ content: [{ type: 'text', text: '{"good": true, "lines": ["ok"], "followUp": null, "translations": ["خوب"]}' }] }), { status: 200 });
  }) as unknown as typeof fetch;
  await claudeUseItJudge('k', fake).check({ ...input, chat: 'target' });
  await claudeUseItJudge('k', fake).check({ ...input, chat: 'native' });
  await claudeWordAsker('k', fake).ask({ word: 'x', translation: 'y', question: 'q', learningLanguage: 'Spanish', nativeLanguage: 'Persian', chat: 'target' });
  expect(prompts[0]).toContain('in Spanish: 1 to 4');
  expect(prompts[0]).toContain('translations');
  expect(prompts[1]).toContain('in Persian: 1 to 4');
  expect(prompts[1]).not.toContain('translations');
  expect(prompts[2]).toContain('in Spanish: 1 to 3');
  expect(prompts[2]).toContain('translations');
});

const app = (chatLanguage: string | null, nativeLanguage = 'English') =>
  new OpenAPIHono<{ Variables: { user: { id: string } } }>()
    .use('*', async (c, next) => (c.set('user', { id: 'u1' }), next()))
    .route('/v1', kaiRoutes({ chatLanguages: async () => ({ learningLanguage: 'English', nativeLanguage, chatLanguage }) }));

test('the Use it lines: the built-in English when nothing else is known, with the place for the word kept', async () => {
  const res = await app('native').request('/v1/kai/use-it-script');
  expect(res.status).toBe(200);
  const body = (await res.json()) as { nativeLanguage: string | null; lines: Record<string, { text: string; translation?: string }> };
  expect(body.nativeLanguage).toBe('English');
  expect(body.lines.useItWrite).toEqual({ text: ENGLISH_SCRIPT.useItWrite });
  expect(body.lines.useItWrite!.text).toContain('{word}');
  expect(Object.keys(body.lines).sort()).toEqual(['replyExample', 'replyNext', 'replySkip', 'useItAskFailed', 'useItCheckFailed', 'useItChecking', 'useItIntro', 'useItThinking', 'useItWrite']);
});
