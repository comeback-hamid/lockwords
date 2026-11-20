import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';

// Small values the app keeps on the device (the login session, a few flags). On a phone: the Keychain / Keystore.
// In a browser there is no such store, so the web app uses localStorage. Same three calls on both.
const web = Platform.OS === 'web';
const local = () => (typeof window === 'undefined' ? null : window.localStorage); // no window while a page is pre-rendered

export async function getItemAsync(key: string): Promise<string | null> {
  if (!web) return SecureStore.getItemAsync(key);
  return local()?.getItem(key) ?? null;
}
export async function setItemAsync(key: string, value: string): Promise<void> {
  if (!web) return SecureStore.setItemAsync(key, value);
  local()?.setItem(key, value);
}
export async function deleteItemAsync(key: string): Promise<void> {
  if (!web) return SecureStore.deleteItemAsync(key);
  local()?.removeItem(key);
}
