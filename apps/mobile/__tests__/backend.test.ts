import { CLOUD, pickBackend } from '@/config/backend';

test('no settings: the app talks to the cloud', () => {
  expect(pickBackend({})).toEqual({ ...CLOUD, name: 'cloud' });
  expect(pickBackend({ apiUrl: '', supabaseUrl: '', supabaseKey: '' }).name).toBe('cloud');
  expect(CLOUD.apiUrl).toMatch(/^https:\/\//);
  expect(CLOUD.supabaseUrl).toMatch(/^https:\/\/.+\.supabase\.co$/);
  expect(CLOUD.supabaseKey).toMatch(/^sb_publishable_/); // the public key, never a secret one
});

test('all three settings: the app talks to that stack (local development, Maestro)', () => {
  const local = { apiUrl: 'http://localhost:8787', supabaseUrl: 'http://localhost:54321', supabaseKey: 'local-key' };
  expect(pickBackend(local)).toEqual({ ...local, name: 'custom' });
});

test('only some settings: an error, because a login from one place is not accepted by a server of another', () => {
  expect(() => pickBackend({ apiUrl: 'http://localhost:8787' })).toThrow('all three');
  expect(() => pickBackend({ supabaseUrl: 'http://localhost:54321', supabaseKey: 'k' })).toThrow('all three');
});
