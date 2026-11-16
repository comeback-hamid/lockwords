import type { ProfilesStore } from '../app.js';
import type { Profile } from '../onboarding/profile.js';
import type { createDb } from './client.js';
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
      const r = row!;
      return {
        learningLanguage: r.learningLanguage,
        nativeLanguage: r.nativeLanguage,
        level: r.level,
        knownWords: r.knownWords,
        cefr: r.cefr,
        goal: r.goal,
        goalOther: r.goalOther,
        interests: r.interests,
      } as Profile;
    },
  };
}
