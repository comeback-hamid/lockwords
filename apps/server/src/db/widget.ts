import { eq } from 'drizzle-orm';

import type { WidgetStore } from '../app.js';
import type { createDb } from './client.js';
import { widgetPlans } from './schema.js';

// The widget plan the server handed out and the looks counted so far: one row per learner.
export function createWidgetStore(db: ReturnType<typeof createDb>['db']): WidgetStore {
  return {
    async get(userId) {
      const [row] = await db.select().from(widgetPlans).where(eq(widgetPlans.userId, userId));
      if (!row) return null;
      return { slots: row.slots.map((s) => ({ at: new Date(s.at), end: new Date(s.end), cardId: s.cardId, ...(s.newLap ? { newLap: true as const } : {}) })), looks: row.looks, countedUntil: row.countedUntil };
    },
    async save(userId, state) {
      const values = { slots: state.slots.map((s) => ({ at: s.at.toISOString(), end: s.end.toISOString(), cardId: s.cardId, ...(s.newLap ? { newLap: true as const } : {}) })), looks: state.looks, countedUntil: state.countedUntil };
      await db.insert(widgetPlans).values({ userId, ...values }).onConflictDoUpdate({ target: widgetPlans.userId, set: values });
    },
  };
}
