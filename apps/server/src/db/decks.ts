import { and, asc, eq, isNull, ne } from 'drizzle-orm';

import type { DecksStore } from '../app.js';
import type { createDb } from './client.js';
import { cards, decks } from './schema.js';

export function createDecksStore(db: ReturnType<typeof createDb>['db']): DecksStore {
  // null for an unknown id, another user's deck and a removed deck: callers cannot tell them apart.
  async function get(userId: string, id: string) {
    const [deck] = await db.select().from(decks).where(and(eq(decks.id, id), eq(decks.userId, userId), isNull(decks.removedAt)));
    if (!deck) return null;
    const rows = await db.select().from(cards).where(and(eq(cards.deckId, id), isNull(cards.removedAt))).orderBy(asc(cards.position));
    return {
      id: deck.id,
      topic: deck.topic,
      title: deck.title,
      reason: deck.reason,
      cefr: deck.cefr,
      titleTranslation: deck.titleTranslation,
      kind: deck.kind as 'topic' | 'random',
      wordCount: deck.kind === 'random' ? rows.length : deck.wordCount, // a Random Words deck grows one word at a time; any other deck has its own size
      status: deck.status as 'proposed' | 'generating' | 'ready',
      cards: rows.map((c) => ({ id: c.id, position: c.position, word: c.word, translation: c.translation, example: c.example, exampleTranslation: c.exampleTranslation, stage: c.stage })),
    };
  }
  return {
    get,
    async create(userId, d) {
      const [row] = await db.insert(decks).values({ userId, ...d }).returning({ id: decks.id });
      return (await get(userId, row!.id))!;
    },
    async saveCards(id, newCards) {
      // Cards and the status change land together or not at all.
      const userId = await db.transaction(async (tx) => {
        await tx.insert(cards).values(newCards.map((c, position) => ({ deckId: id, position, ...c })));
        const [deck] = await tx.update(decks).set({ status: 'ready' }).where(eq(decks.id, id)).returning({ userId: decks.userId });
        return deck!.userId;
      });
      return (await get(userId, id))!;
    },
    async remove(userId, id) {
      return db.transaction(async (tx) => {
        const now = new Date();
        // One statement decides: the caller's deck, not removed, not being made. So a job that starts now cannot slip in between.
        const mine = and(eq(decks.id, id), eq(decks.userId, userId), isNull(decks.removedAt));
        const [gone] = await tx.update(decks).set({ removedAt: now }).where(and(mine, ne(decks.status, 'generating'))).returning({ id: decks.id });
        if (!gone) {
          const [busy] = await tx.select({ id: decks.id }).from(decks).where(mine);
          return busy ? ('generating' as const) : ('not_found' as const);
        }
        await tx.update(cards).set({ removedAt: now }).where(and(eq(cards.deckId, id), isNull(cards.removedAt)));
        return 'removed' as const;
      });
    },
  };
}
