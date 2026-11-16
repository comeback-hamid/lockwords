import { expect, test } from 'vitest';

import { loadEnv } from '../../src/env.js';

test('test mode refuses a database without "test" in its name', () => {
  expect(() => loadEnv({ NODE_ENV: 'test', DATABASE_URL: 'postgres://localhost/lockwords_dev' })).toThrow(/test/);
});

test('test mode accepts lockwords_test', () => {
  expect(loadEnv({ NODE_ENV: 'test', DATABASE_URL: 'postgres://localhost/lockwords_test' }).PORT).toBe(8787);
});
