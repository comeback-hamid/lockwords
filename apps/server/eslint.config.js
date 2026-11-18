import js from '@eslint/js';
import tseslint from 'typescript-eslint';

export default tseslint.config(
  // scripts/engine-check.mjs is the funnel's own test harness, copied as is (only imports and paths changed).
  { ignores: ['dist/**', 'drizzle/**', 'reference/**', 'scripts/engine-check.mjs'] },
  js.configs.recommended,
  ...tseslint.configs.recommended,
);
