import { defineConfig } from 'vitest/config';

// Integration tests share one real database: migrate once, then run the files one after another.
export default defineConfig({
  test: { environment: 'node', include: ['test/integration/**/*.test.ts'], globalSetup: 'test/integration/global-setup.ts', fileParallelism: false },
});
