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
  name: text('name'), // from the Kai chat (O10)
  chatLanguage: text('chat_language'), // 'native' | 'target' (O10b)
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
});

export const decks = pgTable('decks', {
  id: uuid('id').primaryKey().defaultRandom(),
  // = users.id. shortcut: no foreign key yet (see docs/tech-debt.md).
  userId: uuid('user_id').notNull(),
  topic: text('topic').notNull(),
  title: text('title').notNull(),
  reason: text('reason').notNull(),
  cefr: text('cefr').notNull(),
  status: text('status').notNull().default('proposed'), // 'proposed' | 'ready'
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
});

export const cards = pgTable('cards', {
  id: uuid('id').primaryKey().defaultRandom(),
  deckId: uuid('deck_id')
    .notNull()
    .references(() => decks.id),
  position: integer('position').notNull(),
  word: text('word').notNull(),
  translation: text('translation').notNull(),
  example: text('example').notNull(),
  exampleTranslation: text('example_translation').notNull(),
  stage: integer('stage').notNull().default(0), // 0 = new, 1–5 (the server owns SRS)
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
});
