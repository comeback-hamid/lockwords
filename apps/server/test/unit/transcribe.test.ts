import { expect, test } from 'vitest';
import { OpenAPIHono } from '@hono/zod-openapi';

import { openaiTranscriber, transcribeFor, type Transcriber } from '../../src/llm/transcribe.js';
import { transcribeRoutes } from '../../src/routes/transcribe.js';

// The mic in the chat box: a short recording becomes text. The sound is never kept.
const appWith = (transcriber: Transcriber, names = { learningLanguage: 'English', nativeLanguage: 'Persian' }) =>
  new OpenAPIHono<{ Variables: { user: { id: string } } }>().use('*', async (c, next) => (c.set('user', { id: 'u1' }), next())).route('/v1', transcribeRoutes(transcriber, async () => names));
const post = (app: ReturnType<typeof appWith>, body: unknown) => app.request('/v1/transcribe', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
const audio = Buffer.from('sound').toString('base64');

test('a recording comes back as text; the model gets the bytes and the format', async () => {
  const seen: { bytes: number; format: string; languages: readonly string[] }[] = [];
  const res = await post(appWith({ transcribe: async (bytes, format, languages) => (seen.push({ bytes: bytes.length, format, languages }), { text: 'Hola, ¿qué tal?', heard: ['en'] }) }), { audio, format: 'm4a' });
  expect(res.status).toBe(200);
  expect(await res.json()).toEqual({ text: 'Hola, ¿qué tal?' });
  expect(seen).toEqual([{ bytes: 5, format: 'm4a', languages: ['en', 'fa'] }]); // the learner's two languages, from the profile
});

test('a wrong request is 400 and a failed model call is 502', async () => {
  const ok = appWith({ transcribe: async () => ({ text: 'x', heard: [] }) });
  for (const body of [{}, { audio: '', format: 'm4a' }, { audio, format: 'exe' }, { audio: 'x'.repeat(1_500_001), format: 'm4a' }]) expect((await post(ok, body)).status).toBe(400);
  const failing = appWith({ transcribe: async () => Promise.reject(new Error('down')) });
  const res = await post(failing, { audio, format: 'm4a' });
  expect(res.status).toBe(502);
  expect(await res.json()).toEqual({ error: 'transcribe_failed' });
});

test('the OpenAI call sends the file, the key and the expected languages, and reads the text and what was heard', async () => {
  let sent: { url: string; auth: string | null; file: string; model: string; languages: string[] } | null = null;
  const fake = (async (url: string, init: RequestInit) => {
    const form = init.body as FormData;
    sent = { url, auth: new Headers(init.headers).get('Authorization'), file: (form.get('file') as File).name, model: String(form.get('model')), languages: form.getAll('languages[]').map(String) };
    return new Response(JSON.stringify({ text: ' hello there ', languages: [{ code: 'en' }] }), { status: 200 });
  }) as unknown as typeof fetch;
  expect(await openaiTranscriber('k', fake).transcribe(new Uint8Array([1, 2, 3]), 'm4a', ['en', 'fa'])).toEqual({ text: 'hello there', heard: ['en'] });
  expect(sent).toEqual({ url: 'https://api.openai.com/v1/audio/transcriptions', auth: 'Bearer k', file: 'voice.m4a', model: 'gpt-transcribe', languages: ['en', 'fa'] });
  const down = (async () => new Response('no', { status: 500 })) as unknown as typeof fetch;
  await expect(openaiTranscriber('k', down).transcribe(new Uint8Array([1]), 'm4a', [])).rejects.toThrow();
});

// Hamid, 2026-11-25: a short Persian sentence came back as Turkish.
test('a language that is not one of the learner\'s two: the recording is written once more as their own language', async () => {
  const calls: (readonly string[])[] = [];
  const turkishFirst: Transcriber = { transcribe: async (_a, _f, languages) => (calls.push(languages), languages.length === 2 ? { text: 'Nasılsın', heard: ['tr'] } : { text: 'حالت چطوره', heard: ['fa'] }) };
  expect(await transcribeFor(turkishFirst, new Uint8Array([1]), 'm4a', { learning: 'en', native: 'fa' })).toBe('حالت چطوره');
  expect(calls).toEqual([['en', 'fa'], ['fa']]);
});

test('one of the two languages, or a language the model could not name: one call, the text as it is', async () => {
  for (const heard of [['fa'], ['en'], []]) {
    let n = 0;
    const once: Transcriber = { transcribe: async () => (n++, { text: 'ok', heard }) };
    expect(await transcribeFor(once, new Uint8Array([1]), 'm4a', { learning: 'en', native: 'fa' })).toBe('ok');
    expect(n).toBe(1);
  }
  // A typed-in language has no code: no list is sent and nothing is checked.
  const seen: (readonly string[])[] = [];
  const any: Transcriber = { transcribe: async (_a, _f, languages) => (seen.push(languages), { text: 'ok', heard: ['tr'] }) };
  expect(await transcribeFor(any, new Uint8Array([1]), 'm4a', { learning: null, native: null })).toBe('ok');
  expect(seen).toEqual([[]]);
});
