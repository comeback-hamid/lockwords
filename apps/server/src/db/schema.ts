import { boolean, pgTable, timestamp, uuid } from 'drizzle-orm/pg-core';

// Drizzle tables live here. Migrations are add-only: add tables and columns; drop or rename in a later deploy.

export const users = pgTable('users', {
  id: uuid('id').primaryKey(), // = Supabase user id (token "sub")
  isGuest: boolean('is_guest').notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
});
