import { eq } from 'drizzle-orm';

import type { KaiScriptStore } from '../app.js';
import type { createDb } from './client.js';
import { kaiScripts } from './schema.js';

// Kai's onboarding script per language: translated once, read many times.
export function createKaiScriptStore(db: ReturnType<typeof createDb>['db']): KaiScriptStore {
  return {
    async get(language) {
      const [row] = await db.select({ lines: kaiScripts.lines }).from(kaiScripts).where(eq(kaiScripts.language, language));
      return row?.lines ?? null;
    },
    async save(language, lines) {
      // Two first calls at once: the first one kept wins.
      await db.insert(kaiScripts).values({ language, lines }).onConflictDoNothing();
    },
  };
}
