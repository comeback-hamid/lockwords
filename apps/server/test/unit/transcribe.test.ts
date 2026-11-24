import { expect, test } from 'vitest';
import { OpenAPIHono } from '@hono/zod-openapi';

import { openaiTranscriber, type Transcriber } from '../../src/llm/transcribe.js';
import { transcribeRoutes } from '../../src/routes/transcribe.js';

// The mic in the chat box: a short recording becomes text. The sound is never kept.
const appWith = (transcriber: Transcriber) => new OpenAPIHono().route('/v1', transcribeRoutes(transcriber));
const post = (app: ReturnType<typeof appWith>, body: unknown) => app.request('/v1/transcribe', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
const audio = Buffer.from('sound').toString('base64');

test('a recording comes back as text; the model gets the bytes and the format', async () => {
  const seen: { bytes: number; format: string }[] = [];
  const res = await post(appWith({ transcribe: async (bytes, format) => (seen.push({ bytes: bytes.length, format }), 'Hola, ¿qué tal?') }), { audio, format: 'm4a' });
  expect(res.status).toBe(200);
  expect(await res.json()).toEqual({ text: 'Hola, ¿qué tal?' });
  expect(seen).toEqual([{ bytes: 5, format: 'm4a' }]);
});

test('a wrong request is 400 and a failed model call is 502', async () => {
  const ok = appWith({ transcribe: async () => 'x' });
  for (const body of [{}, { audio: '', format: 'm4a' }, { audio, format: 'exe' }, { audio: 'x'.repeat(1_500_001), format: 'm4a' }]) expect((await post(ok, body)).status).toBe(400);
  const failing = appWith({ transcribe: async () => Promise.reject(new Error('down')) });
  const res = await post(failing, { audio, format: 'm4a' });
  expect(res.status).toBe(502);
  expect(await res.json()).toEqual({ error: 'transcribe_failed' });
});

test('the OpenAI call sends the file and the key, and reads the text', async () => {
  let sent: { url: string; auth: string | null; file: string; model: string } | null = null;
  const fake = (async (url: string, init: RequestInit) => {
    const form = init.body as FormData;
    sent = { url, auth: new Headers(init.headers).get('Authorization'), file: (form.get('file') as File).name, model: String(form.get('model')) };
    return new Response(JSON.stringify({ text: ' hello there ' }), { status: 200 });
  }) as unknown as typeof fetch;
  expect(await openaiTranscriber('k', fake).transcribe(new Uint8Array([1, 2, 3]), 'm4a')).toBe('hello there');
  expect(sent).toEqual({ url: 'https://api.openai.com/v1/audio/transcriptions', auth: 'Bearer k', file: 'voice.m4a', model: 'gpt-4o-transcribe' });
  const down = (async () => new Response('no', { status: 500 })) as unknown as typeof fetch;
  await expect(openaiTranscriber('k', down).transcribe(new Uint8Array([1]), 'm4a')).rejects.toThrow();
});
