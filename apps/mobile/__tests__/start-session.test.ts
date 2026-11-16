import { ensureGuest } from '@/auth/guest';
import { startSession } from '@/auth/start-session';

const session = (token: string) => ({ data: { session: { access_token: token } }, error: null });
const none = { data: { session: null }, error: null };

test('no saved session → signs in as a guest', async () => {
  const auth = { getSession: jest.fn(async () => none), signInAnonymously: jest.fn(async () => session('new')) };
  expect(await ensureGuest(auth)).toBe('new');
  expect(auth.signInAnonymously).toHaveBeenCalledTimes(1);
});

test('saved session → reuses it, makes no new guest', async () => {
  const auth = { getSession: jest.fn(async () => session('saved')), signInAnonymously: jest.fn() };
  expect(await ensureGuest(auth)).toBe('saved');
  expect(auth.signInAnonymously).not.toHaveBeenCalled();
});

test('sign-in fails → null, nothing thrown', async () => {
  const auth = {
    getSession: jest.fn(async () => none),
    signInAnonymously: jest.fn(async () => ({ data: { session: null }, error: new Error('offline') })),
  };
  expect(await ensureGuest(auth)).toBeNull();
  const throwing = { getSession: jest.fn(async () => Promise.reject(new Error('boom'))), signInAnonymously: jest.fn() };
  expect(await ensureGuest(throwing)).toBeNull();
});

test('startSession: clears on fresh install first, then signs in, then asks the server who we are', async () => {
  const order: string[] = [];
  const me = { id: 'u1', isGuest: true, createdAt: '2026-11-16T00:00:00.000Z' };
  const result = await startSession({
    clearOnFreshInstall: async () => void order.push('clear'),
    ensureGuest: async () => (order.push('guest'), 'tok'),
    fetchMe: async () => (order.push('me'), me),
  });
  expect(order).toEqual(['clear', 'guest', 'me']);
  expect(result).toEqual(me);
});

test('startSession: no session → the server is not called', async () => {
  const fetchMe = jest.fn();
  expect(await startSession({ clearOnFreshInstall: async () => {}, ensureGuest: async () => null, fetchMe })).toBeNull();
  expect(fetchMe).not.toHaveBeenCalled();
});

test('startSession: server down → null, nothing thrown', async () => {
  const result = await startSession({
    clearOnFreshInstall: async () => {},
    ensureGuest: async () => 'tok',
    fetchMe: async () => Promise.reject(new Error('network')),
  });
  expect(result).toBeNull();
});
