import { sql } from 'drizzle-orm';

import type { UsersStore } from '../app.js';
import type { createDb } from './client.js';
import { users } from './schema.js';

export function createUsersStore(db: ReturnType<typeof createDb>['db']): UsersStore {
  return {
    // One statement, so two first calls at once still leave one row.
    async upsert(id, isGuest) {
      const [row] = await db
        .insert(users)
        .values({ id, isGuest })
        .onConflictDoUpdate({ target: users.id, set: { isGuest: sql`excluded.is_guest` } })
        .returning();
      return row!;
    },
  };
}
