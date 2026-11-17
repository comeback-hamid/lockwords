import { eq } from 'drizzle-orm';

import type { WordTestStore } from '../onboarding/word-test-store.js';
import type { createDb } from './client.js';
import { wordPacks, wordTestResults } from './schema.js';

export function createWordTestStore(db: ReturnType<typeof createDb>['db']): WordTestStore {
  return {
    async getPack(language) {
      const [row] = await db.select({ pages: wordPacks.pages }).from(wordPacks).where(eq(wordPacks.language, language));
      return row?.pages ?? null;
    },
    async savePack(language, pages) {
      // Two first users at once: the first pack wins, both read it back.
      await db.insert(wordPacks).values({ language, pages }).onConflictDoNothing();
    },
    async saveResult(row) {
      await db.insert(wordTestResults).values(row);
    },
  };
}
