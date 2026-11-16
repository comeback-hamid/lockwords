import { boolean, integer, pgTable, text, timestamp, uuid } from 'drizzle-orm/pg-core';

// Drizzle tables live here. Migrations are add-only: add tables and columns; drop or rename in a later deploy.

export const users = pgTable('users', {
  id: uuid('id').primaryKey(), // = Supabase user id (token "sub")
  isGuest: boolean('is_guest').notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
});

// Onboarding answers (O1–O9). One row per user; a new save replaces the old one.
export const profiles = pgTable('profiles', {
  // = users.id. shortcut: no foreign key yet (see docs/tech-debt.md), add it with the decks tables.
  userId: uuid('user_id').primaryKey(),
  learningLanguage: text('learning_language').notNull(),
  nativeLanguage: text('native_language').notNull(),
  level: text('level').notNull(),
  knownWords: integer('known_words'),
  cefr: text('cefr'),
  goal: text('goal').notNull(),
  goalOther: text('goal_other'),
  interests: text('interests').array().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
});
