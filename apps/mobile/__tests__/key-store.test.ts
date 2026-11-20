import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';

jest.mock('expo-secure-store', () => ({ getItemAsync: jest.fn(async () => 'from the keychain'), setItemAsync: jest.fn(async () => {}), deleteItemAsync: jest.fn(async () => {}) }));

const load = (os: string) => {
  let store!: typeof import('@/platform/key-store');
  jest.isolateModules(() => {
    Platform.OS = os as typeof Platform.OS;
    store = require('@/platform/key-store');
  });
  return store;
};
const real = Platform.OS;
afterEach(() => {
  Platform.OS = real;
  delete (globalThis as { window?: unknown }).window;
});

test('on a phone the values go to the secure store', async () => {
  const store = load('ios');
  expect(await store.getItemAsync('k')).toBe('from the keychain');
  await store.setItemAsync('k', 'v');
  await store.deleteItemAsync('k');
  expect(SecureStore.setItemAsync).toHaveBeenCalledWith('k', 'v');
  expect(SecureStore.deleteItemAsync).toHaveBeenCalledWith('k');
});

test('in a browser the values go to localStorage, and the secure store is not touched', async () => {
  jest.clearAllMocks();
  const data = new Map<string, string>();
  (globalThis as { window?: unknown }).window = { localStorage: { getItem: (k: string) => data.get(k) ?? null, setItem: (k: string, v: string) => void data.set(k, v), removeItem: (k: string) => void data.delete(k) } };
  const store = load('web');
  expect(await store.getItemAsync('k')).toBeNull();
  await store.setItemAsync('k', 'v');
  expect(await store.getItemAsync('k')).toBe('v');
  await store.deleteItemAsync('k');
  expect(await store.getItemAsync('k')).toBeNull();
  expect(SecureStore.setItemAsync).not.toHaveBeenCalled();
});

test('with no window (a page made on the server) nothing breaks', async () => {
  const store = load('web');
  expect(await store.getItemAsync('k')).toBeNull();
  await expect(store.setItemAsync('k', 'v')).resolves.toBeUndefined();
});
