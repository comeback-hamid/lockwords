import { and, asc, eq } from 'drizzle-orm';

import type { DecksStore } from '../app.js';
import type { createDb } from './client.js';
import { cards, decks } from './schema.js';

export function createDecksStore(db: ReturnType<typeof createDb>['db']): DecksStore {
  // null for an unknown id and for another user's deck: callers cannot tell them apart.
  async function get(userId: string, id: string) {
    const [deck] = await db.select().from(decks).where(and(eq(decks.id, id), eq(decks.userId, userId)));
    if (!deck) return null;
    const rows = await db.select().from(cards).where(eq(cards.deckId, id)).orderBy(asc(cards.position));
    return {
      id: deck.id,
      topic: deck.topic,
      title: deck.title,
      reason: deck.reason,
      cefr: deck.cefr,
      wordCount: 10,
      status: deck.status as 'proposed' | 'ready',
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
  };
}
