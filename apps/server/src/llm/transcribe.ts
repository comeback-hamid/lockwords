// Voice to text for the chat box (the mic in every Kai chat). The audio is sent to the model and then dropped:
// the server keeps the text the learner sends afterwards, never the sound.
export const AUDIO_FORMATS = ['m4a', 'mp4', 'webm', 'wav', '3gp', 'ogg'] as const;
export type AudioFormat = (typeof AUDIO_FORMATS)[number];
// `languages`: the codes the learner may speak (the language they learn and their own), like ["en", "fa"]. Empty = any.
// The answer says which language the model heard, when it could tell.
export type Transcript = { text: string; heard: string[] };
export type Transcriber = { transcribe(audio: Uint8Array, format: AudioFormat, languages: readonly string[]): Promise<Transcript> };

const TRANSCRIBE_TIMEOUT_MS = 30_000;
const MODEL = 'gpt-transcribe';

// OpenAI's transcription API (model `gpt-transcribe`: it takes the list of expected languages and says what it heard).
export const openaiTranscriber = (apiKey: string, fetchFn: typeof fetch = fetch, model = MODEL): Transcriber => ({
  async transcribe(audio, format, languages) {
    const form = new FormData();
    form.append('file', new Blob([audio as BlobPart]), `voice.${format}`);
    form.append('model', model);
    form.append('response_format', 'json');
    for (const code of languages) form.append('languages[]', code);
    const res = await fetchFn('https://api.openai.com/v1/audio/transcriptions', { method: 'POST', headers: { Authorization: `Bearer ${apiKey}` }, body: form, signal: AbortSignal.timeout(TRANSCRIBE_TIMEOUT_MS) });
    if (!res.ok) throw new Error(`transcription failed: ${res.status}`);
    const body = (await res.json()) as { text?: unknown; languages?: unknown };
    if (typeof body.text !== 'string') throw new Error('transcription has no text');
    const heard = Array.isArray(body.languages) ? body.languages.map((l) => (l as { code?: unknown } | null)?.code).filter((c): c is string => typeof c === 'string') : [];
    return { text: body.text.trim(), heard };
  },
});

// A learner speaks one of two languages: the one they learn or their own (Hamid, 2026-11-25: a short Persian
// sentence came back as Turkish). The model gets both as the expected languages. If it still says it heard another
// language, the recording is written once more as the learner's own language only.
export async function transcribeFor(transcriber: Transcriber, audio: Uint8Array, format: AudioFormat, speaks: { learning: string | null; native: string | null }): Promise<string> {
  const expected = [...new Set([speaks.learning, speaks.native].filter((c): c is string => !!c))];
  const first = await transcriber.transcribe(audio, format, expected);
  const other = expected.length > 0 && first.heard.length > 0 && !first.heard.some((code) => expected.includes(code));
  if (!other || !speaks.native) return first.text;
  return (await transcriber.transcribe(audio, format, [speaks.native])).text;
}

// No key (local runs, tests): a fixed sentence, so the app's flow can be tried.
export const fixtureTranscriber: Transcriber = { transcribe: async () => ({ text: 'This is what I said.', heard: [] }) };
