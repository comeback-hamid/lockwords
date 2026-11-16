import { Platform } from 'react-native';

// shortcut: spike only, hard-coded dev server; the real app calls the generated API client.
const SPIKE_URL = 'http://localhost:8787/spike/word';

export async function syncLockWord(): Promise<void> {
  if (Platform.OS !== 'ios') return;
  const res = await fetch(SPIKE_URL);
  if (!res.ok) throw new Error(`spike word: HTTP ${res.status}`);
  const { word, meaning } = (await res.json()) as { word: string; meaning: string };
  const { default: LockWord } = await import('./lock-word-widget');
  LockWord.updateSnapshot({ word, meaning });
}
