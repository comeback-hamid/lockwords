import { boolean, index, integer, jsonb, pgTable, real, text, timestamp, uuid } from 'drizzle-orm/pg-core';

// Drizzle tables live here. Migrations are add-only: add tables and columns; drop or rename in a later deploy.

export const users = pgTable('users', {
  id: uuid('id').primaryKey(), // = Supabase user id (token "sub")
  isGuest: boolean('is_guest').notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
});

// Onboarding answers (O1–O9). One row per user; a new save replaces the old one.
export const profiles = pgTable('profiles', {
  userId: uuid('user_id')
    .primaryKey()
    .references(() => users.id),
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
  kaiTranslationOn: boolean('kai_translation_on'), // New words chat: null = follow the level (on for A1/A2)
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
});

export const decks = pgTable('decks', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id')
    .notNull()
    .references(() => users.id),
  topic: text('topic').notNull(),
  title: text('title').notNull(),
  reason: text('reason').notNull(),
  cefr: text('cefr').notNull(),
  status: text('status').notNull().default('proposed'), // 'proposed' | 'generating' | 'ready'
  kind: text('kind').notNull().default('topic'), // 'topic' | 'random' ("Random Words N": single words from the chat)
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
  dueAt: timestamp('due_at', { withTimezone: true }), // null = new or known
  known: boolean('known').notNull().default(false), // swiped up: never shown again
  hard: boolean('hard').notNull().default(false), // swiped left: goes to the lock screen
  lastReviewedAt: timestamp('last_reviewed_at', { withTimezone: true }), // last swipe or Use it; Kai tells the learner how much they practiced
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
});

// Typed-language word tests made by AI (docs/vocab-engine.md 1.3), kept and reused for every user of that language.
export const wordPacks = pgTable('word_packs', {
  language: text('language').primaryKey(), // the typed name, trimmed, lower case
  pages: jsonb('pages').$type<{ A: string[]; B: string[]; C: string[] }>().notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
});

// Every finished word test, for tuning the word lists later (docs/vocab-engine.md 1.12).
export const wordTestResults = pgTable('word_test_results', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id')
    .notNull()
    .references(() => users.id),
  language: text('language').notNull(),
  version: integer('version').notNull(), // engine version (4)
  words: integer('words').notNull(),
  raw: integer('raw').notNull(),
  lo: integer('lo').notNull(),
  hi: integer('hi').notNull(),
  r50: integer('r50').notNull(),
  g: real('g').notNull(),
  realKnown: integer('real_known').notNull(),
  fakes: integer('fakes').notNull(),
  fn: integer('fn').notNull(),
  pages: text('pages').notNull(), // e.g. "ABC"
  reliable: boolean('reliable').notNull(),
  ticks: text('ticks').notNull(), // "A:1101…,B:…" (1 or 0 per item, file order)
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
});

// The New words chat with Kai. One row per bubble. Kai's last line of a turn holds that turn's reply options.
export const kaiMessages = pgTable(
  'kai_messages',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id),
    role: text('role').notNull(), // 'kai' | 'user'
    text: text('text').notNull(),
    translation: text('translation'), // Kai's lines only; always saved, the app shows or hides it
    options: text('options').array().notNull().default([]),
    opening: boolean('opening').notNull().default(false), // part of a turn where Kai spoke first
    position: integer('position').notNull().default(0), // order inside one turn (same created_at)
    // A word card on Kai's last line of a turn, and what adding it gave (src/decks/random-words.ts).
    word: jsonb('word').$type<{ word: string; translation: string; example: string; exampleTranslation: string; result?: { deckId: string; deckTitle: string; count: number; already: boolean } }>(),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index('kai_messages_user_time').on(t.userId, t.createdAt)],
);

// What Kai remembers about a learner: short plain sentences. At most 50 per user, oldest dropped.
export const kaiNotes = pgTable(
  'kai_notes',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id),
    text: text('text').notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index('kai_notes_user_time').on(t.userId, t.createdAt)],
);
