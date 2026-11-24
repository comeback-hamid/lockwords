import { api } from '@/auth/boot';

// The mic in the chat box (Hamid, 2026-11-24): the learner speaks, the recording becomes text in the box, and they
// can change it before they send it. The sound goes to our server once and is kept nowhere.
export const MAX_RECORDING_MS = 90_000; // a longer talk is stopped and written
const FORMATS = ['m4a', 'mp4', 'webm', 'wav', '3gp', 'ogg'] as const;
type Format = (typeof FORMATS)[number];

// The file type from the recording's name. A browser gives a `blob:` address with no ending: it records webm.
export function audioFormat(uri: string): Format {
  const ending = /\.(\w+)(?:\?.*)?$/.exec(uri)?.[1]?.toLowerCase();
  return FORMATS.find((f) => f === ending) ?? (uri.startsWith('blob:') ? 'webm' : 'm4a');
}

const asBase64 = (blob: Blob) =>
  new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error('could not read the recording'));
    reader.onload = () => resolve(String(reader.result).replace(/^data:[^,]*,/, ''));
    reader.readAsDataURL(blob);
  });

// The recording as text. Throws when the file cannot be read or the server cannot write it.
export async function transcribeRecording(uri: string): Promise<string> {
  const blob = await (await fetch(uri)).blob();
  return api.transcribe(await asBase64(blob), audioFormat(uri));
}

// A new piece of spoken text goes after what is already in the box.
export const addSpoken = (text: string, spoken: string) => [text.trim(), spoken.trim()].filter(Boolean).join(' ');

// The wave: the last levels of the mic, 0 to 1. The recorder reports decibels (about -60 quiet, 0 loud).
export const WAVE_BARS = 28;
export const level = (decibels: number | undefined) => (decibels === undefined ? 0 : Math.max(0, Math.min(1, (decibels + 60) / 60)));
export const pushLevel = (levels: number[], next: number) => [...levels, next].slice(-WAVE_BARS);
export const clock = (ms: number) => `${Math.floor(ms / 60_000)}:${String(Math.floor(ms / 1000) % 60).padStart(2, '0')}`;
