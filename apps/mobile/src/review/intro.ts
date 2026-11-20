import * as SecureStore from '@/platform/key-store';

// The one-time screens after the very first round (hard words, trial reminder, paywall).
const KEY = 'lockwords.introDone'; // listed in SECURE_KEYS, so a fresh install clears it

export async function isIntroDone() {
  try {
    return (await SecureStore.getItemAsync(KEY)) === '1';
  } catch {
    return true; // never trap the user in the intro
  }
}
export async function markIntroDone() {
  await SecureStore.setItemAsync(KEY, '1').catch(() => {});
}
