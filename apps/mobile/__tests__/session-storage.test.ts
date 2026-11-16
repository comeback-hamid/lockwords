import * as SecureStore from 'expo-secure-store';

import { clearOnFreshInstall, SECURE_KEYS, sessionStorage } from '@/auth/session-storage';

const mockStore = new Map<string, string>();
let mockMarkerExists = false;

jest.mock('expo-secure-store', () => ({
  getItemAsync: jest.fn(async (k: string) => mockStore.get(k) ?? null),
  setItemAsync: jest.fn(async (k: string, v: string) => void mockStore.set(k, v)),
  deleteItemAsync: jest.fn(async (k: string) => void mockStore.delete(k)),
}));
jest.mock('expo-file-system', () => ({
  Paths: { document: 'doc' },
  File: class {
    get exists() {
      return mockMarkerExists;
    }
    create() {
      mockMarkerExists = true;
    }
  },
}));

beforeEach(() => {
  mockStore.clear();
  mockMarkerExists = false;
});

test('a long session is saved in small pieces and read back whole', async () => {
  const long = 'x'.repeat(5000);
  await sessionStorage.setItem(SECURE_KEYS[0], long);
  for (const [, v] of mockStore) expect(v.length).toBeLessThanOrEqual(2000);
  expect(await sessionStorage.getItem(SECURE_KEYS[0])).toBe(long);
});

test('a shorter value replaces a longer one with no leftovers', async () => {
  await sessionStorage.setItem(SECURE_KEYS[0], 'x'.repeat(5000));
  await sessionStorage.setItem(SECURE_KEYS[0], 'short');
  expect(await sessionStorage.getItem(SECURE_KEYS[0])).toBe('short');
});

test('removeItem removes every piece', async () => {
  await sessionStorage.setItem(SECURE_KEYS[0], 'x'.repeat(5000));
  await sessionStorage.removeItem(SECURE_KEYS[0]);
  expect(await sessionStorage.getItem(SECURE_KEYS[0])).toBeNull();
  expect(mockStore.size).toBe(0);
});

test('fresh install: old keychain values are cleared and the marker is written', async () => {
  await sessionStorage.setItem(SECURE_KEYS[0], 'old session from a deleted install');
  await clearOnFreshInstall();
  expect(await sessionStorage.getItem(SECURE_KEYS[0])).toBeNull();
  expect(mockMarkerExists).toBe(true);
});

test('reopen (marker exists): the session is kept', async () => {
  mockMarkerExists = true;
  await sessionStorage.setItem(SECURE_KEYS[0], 'my session');
  jest.mocked(SecureStore.deleteItemAsync).mockClear(); // setItem itself deletes old pieces
  await clearOnFreshInstall();
  expect(await sessionStorage.getItem(SECURE_KEYS[0])).toBe('my session');
  expect(SecureStore.deleteItemAsync).not.toHaveBeenCalled();
});
