// Voice to text for the chat box (the mic in every Kai chat). The audio is sent to the model and then dropped:
// the server keeps the text the learner sends afterwards, never the sound.
export const AUDIO_FORMATS = ['m4a', 'mp4', 'webm', 'wav', '3gp', 'ogg'] as const;
export type AudioFormat = (typeof AUDIO_FORMATS)[number];
export type Transcriber = { transcribe(audio: Uint8Array, format: AudioFormat): Promise<string> };

const TRANSCRIBE_TIMEOUT_MS = 30_000;
const MODEL = 'gpt-4o-transcribe';

// OpenAI's transcription API. The language is not set: a learner may speak the language they learn or their own.
export const openaiTranscriber = (apiKey: string, fetchFn: typeof fetch = fetch, model = MODEL): Transcriber => ({
  async transcribe(audio, format) {
    const form = new FormData();
    form.append('file', new Blob([audio as BlobPart]), `voice.${format}`);
    form.append('model', model);
    form.append('response_format', 'json');
    const res = await fetchFn('https://api.openai.com/v1/audio/transcriptions', { method: 'POST', headers: { Authorization: `Bearer ${apiKey}` }, body: form, signal: AbortSignal.timeout(TRANSCRIBE_TIMEOUT_MS) });
    if (!res.ok) throw new Error(`transcription failed: ${res.status}`);
    const body = (await res.json()) as { text?: unknown };
    if (typeof body.text !== 'string') throw new Error('transcription has no text');
    return body.text.trim();
  },
});

// No key (local runs, tests): a fixed sentence, so the app's flow can be tried.
export const fixtureTranscriber: Transcriber = { transcribe: async () => 'This is what I said.' };
