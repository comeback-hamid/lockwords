import { File, Paths } from 'expo-file-system';
import * as SecureStore from 'expo-secure-store';

// Every key we keep in the iOS Keychain / Android Keystore. Add new ones here so a fresh install clears them.
export const SECURE_KEYS = ['lockwords.session', 'lockwords.onboarded', 'lockwords.introDone'] as const;

// SecureStore values should stay under ~2 KB, and a Supabase session can be bigger. So we save it in pieces:
// "<key>" holds the number of pieces, "<key>.0", "<key>.1"… hold the text.
const PIECE = 1800;

async function removeItem(key: string) {
  const n = Number(await SecureStore.getItemAsync(key)) || 0;
  for (let i = 0; i < n; i++) await SecureStore.deleteItemAsync(`${key}.${i}`);
  await SecureStore.deleteItemAsync(key);
}

export const sessionStorage = {
  async getItem(key: string) {
    const n = Number(await SecureStore.getItemAsync(key));
    if (!n) return null;
    let value = '';
    for (let i = 0; i < n; i++) {
      const piece = await SecureStore.getItemAsync(`${key}.${i}`);
      if (piece === null) return null; // a half-written value counts as no session
      value += piece;
    }
    return value;
  },
  async setItem(key: string, value: string) {
    await removeItem(key);
    const n = Math.ceil(value.length / PIECE);
    for (let i = 0; i < n; i++) await SecureStore.setItemAsync(`${key}.${i}`, value.slice(i * PIECE, (i + 1) * PIECE));
    await SecureStore.setItemAsync(key, String(n));
  },
  removeItem,
};

// The iOS Keychain survives deleting the app. The marker file does not. No marker = fresh install = clear old secrets.
export async function clearOnFreshInstall() {
  const marker = new File(Paths.document, 'installed');
  if (marker.exists) return;
  for (const key of SECURE_KEYS) await removeItem(key);
  marker.create();
}
