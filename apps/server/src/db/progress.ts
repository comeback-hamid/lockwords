import { and, desc, eq, gte, isNull, sql } from 'drizzle-orm';

import type { ProgressStore } from '../app.js';
import type { createDb } from './client.js';
import { cards, decks, profiles, reviewEvents } from './schema.js';

// Reads the rows the Progress tab is counted from. No rules here: src/progress/numbers.ts counts.
export function createProgressStore(db: ReturnType<typeof createDb>['db']): ProgressStore {
  return {
    // The learner's ready decks that are not removed (newest first), each with its words that are not removed.
    async decks(userId) {
      const deckRows = await db
        .select({ id: decks.id, topic: decks.topic, title: decks.title, kind: decks.kind })
        .from(decks)
        .where(and(eq(decks.userId, userId), eq(decks.status, 'ready'), isNull(decks.removedAt)))
        .orderBy(desc(decks.createdAt));
      const cardRows = await db
        .select({ deckId: cards.deckId, stage: cards.stage, known: cards.known, hard: cards.hard })
        .from(cards)
        .innerJoin(decks, eq(cards.deckId, decks.id))
        .where(and(eq(decks.userId, userId), eq(decks.status, 'ready'), isNull(decks.removedAt), isNull(cards.removedAt)));
      return deckRows.map((d) => ({ ...d, kind: d.kind as 'topic' | 'random', words: cardRows.filter((c) => c.deckId === d.id).map(({ stage, known, hard }) => ({ stage, known, hard })) }));
    },
    async learningLanguage(userId) {
      const [p] = await db.select({ language: profiles.learningLanguage }).from(profiles).where(eq(profiles.userId, userId));
      return p?.language ?? '';
    },
    // New words started on or after that review day (first swipe or good sentence on a new word, not undone).
    async startedSince(userId, day) {
      const [row] = await db
        .select({ n: sql<number>`count(distinct ${reviewEvents.cardId})::int` })
        .from(reviewEvents)
        .where(and(eq(reviewEvents.userId, userId), gte(reviewEvents.reviewDay, day), isNull(reviewEvents.undoneAt), sql`(${reviewEvents.before}->>'stage')::int = 0`));
      return row?.n ?? 0;
    },
  };
}
