import { eq } from 'drizzle-orm';

import type { PlanStore } from '../app.js';
import type { createDb } from './client.js';
import { deckPlans } from './schema.js';

// The learner's word plan: one row per learner, replaced when a new plan is made.
export function createPlanStore(db: ReturnType<typeof createDb>['db']): PlanStore {
  return {
    async get(userId) {
      const [row] = await db.select({ items: deckPlans.items, createdAt: deckPlans.createdAt }).from(deckPlans).where(eq(deckPlans.userId, userId));
      return row ?? null;
    },
    async save(userId, items, now) {
      await db.insert(deckPlans).values({ userId, items, createdAt: now }).onConflictDoUpdate({ target: deckPlans.userId, set: { items, createdAt: now } });
    },
  };
}
