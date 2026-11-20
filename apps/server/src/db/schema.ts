import { boolean, date, index, integer, jsonb, pgTable, real, text, timestamp, uuid } from 'drizzle-orm/pg-core';

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
  titleTranslation: text('title_translation'), // the title in the native language; only decks Kai offers in the New words chat
  wordCount: integer('word_count').notNull().default(10), // how many cards the deck gets: 10 in onboarding, 10 to 30 from the chat
  kind: text('kind').notNull().default('topic'), // 'topic' | 'random' ("Random Words N": single words from the chat)
  removedAt: timestamp('removed_at', { withTimezone: true }), // set = the learner removed the deck. A mark, not a delete: chat messages point at decks.
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
  meaning: text('meaning'), // a short definition in the learned language (top band only); null = the card back shows the translation
  stage: integer('stage').notNull().default(0), // 0 = new, 1–5 (the server owns SRS)
  dueAt: timestamp('due_at', { withTimezone: true }), // null = new or known
  known: boolean('known').notNull().default(false), // swiped up: never shown again
  hard: boolean('hard').notNull().default(false), // swiped left: goes to the lock screen
  lastReviewedAt: timestamp('last_reviewed_at', { withTimezone: true }), // last swipe or Use it; Kai tells the learner how much they practiced
  removedAt: timestamp('removed_at', { withTimezone: true }), // set = removed by the learner (the card alone, or with its deck). Every reader skips it.
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
});

// Typed-language word tests made by AI (docs/vocab-engine.md 1.3), kept and reused for every user of that language.
export const wordPacks = pgTable('word_packs', {
  language: text('language').primaryKey(), // the typed name, trimmed, lower case
  pages: jsonb('pages').$type<{ A: string[]; B: string[]; C: string[] }>().notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
});

// Kai's onboarding script in one language, translated once by the AI and kept (src/kai/script.ts).
export const kaiScripts = pgTable('kai_scripts', {
  language: text('language').primaryKey(), // the name or code as the app sends it, trimmed, lower case
  lines: jsonb('lines').$type<Record<string, string>>().notNull(),
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
    deckIds: uuid('deck_ids').array().notNull().default([]), // deck ideas shown under this line (1 or 3), in order
    readyDeckId: uuid('ready_deck_id'), // set on Kai's "your deck is ready" line, so Kai says it once per deck
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

// One row per swipe or good Use it sentence (the review history). Streak, today's numbers, the daily new-word
// limit and undo all read it. `before` and `after` are the card's state, so an undo needs no extra rule.
export type ReviewEventState = { stage: number; known: boolean; hard: boolean; dueAt: string | null };
export const reviewEvents = pgTable(
  'review_events',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id),
    cardId: uuid('card_id')
      .notNull()
      .references(() => cards.id),
    kind: text('kind').notNull(), // 'easy' | 'hard' | 'known' | 'use_it'
    reviewDay: date('review_day').notNull(), // the learner's review day (starts 04:00 on their clock), "YYYY-MM-DD"
    before: jsonb('before').$type<ReviewEventState>().notNull(),
    after: jsonb('after').$type<ReviewEventState>().notNull(),
    undoneAt: timestamp('undone_at', { withTimezone: true }), // set = taken back; it then counts nowhere
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index('review_events_user_day').on(t.userId, t.reviewDay)],
);
