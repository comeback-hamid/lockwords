import type { ProfilesStore } from '../app.js';
import type { Profile } from '../onboarding/profile.js';
import type { createDb } from './client.js';
import { eq } from 'drizzle-orm';

import { profiles } from './schema.js';

export function createProfilesStore(db: ReturnType<typeof createDb>['db']): ProfilesStore {
  return {
    async upsert(userId, p) {
      const values = { ...p, updatedAt: new Date() };
      const [row] = await db
        .insert(profiles)
        .values({ userId, ...values })
        .onConflictDoUpdate({ target: profiles.userId, set: values })
        .returning();
      return toProfile(row!);
    },
    async get(userId) {
      const [row] = await db.select().from(profiles).where(eq(profiles.userId, userId));
      return row ? toProfile(row) : null;
    },
    async setChat(userId, name, chatLanguage) {
      const rows = await db.update(profiles).set({ name, chatLanguage }).where(eq(profiles.userId, userId)).returning({ id: profiles.userId });
      return rows.length > 0;
    },
  };
}

const toProfile = (r: typeof profiles.$inferSelect) =>
  ({
    learningLanguage: r.learningLanguage,
    nativeLanguage: r.nativeLanguage,
    level: r.level,
    knownWords: r.knownWords,
    cefr: r.cefr,
    goal: r.goal,
    goalOther: r.goalOther,
    interests: r.interests,
  }) as Profile;
