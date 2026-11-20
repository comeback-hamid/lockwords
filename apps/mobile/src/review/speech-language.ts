import * as SecureStore from '@/platform/key-store';

// The language the speaker reads words in (a code like "es"). Saved on the phone so it survives a restart.
const KEY = 'lockwords.learning'; // listed in SECURE_KEYS, so a fresh install clears it

let language: string | undefined;

export const getSpeechLanguage = () => language;
// Read once at app start (root layout).
export async function loadSpeechLanguage() {
  language = (await SecureStore.getItemAsync(KEY).catch(() => null)) || undefined;
}
// null = a typed-in language with no code: the phone's default voice is used.
export async function saveSpeechLanguage(code: string | null) {
  language = code ?? undefined;
  await (code ? SecureStore.setItemAsync(KEY, code) : SecureStore.deleteItemAsync(KEY)).catch(() => {});
}
