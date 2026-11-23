import { and, asc, eq, isNull } from 'drizzle-orm';

import type { PicturesStore } from '../app.js';
import type { createDb } from './client.js';
import { cardPictures, cards, decks } from './schema.js';

// The path a card's picture is served at; the routes put the server's address in front.
export const picturePath = (pictureId: string | null) => (pictureId ? `/pictures/${pictureId}` : null);

export function createPicturesStore(db: ReturnType<typeof createDb>['db']): PicturesStore {
  return {
    async todo(deckId) {
      const rows = await db
        .select({ cardId: cards.id, word: cards.word, translation: cards.translation, pictureHint: cards.pictureHint })
        .from(cards)
        .where(and(eq(cards.deckId, deckId), isNull(cards.removedAt), isNull(cards.pictureId)))
        .orderBy(asc(cards.position));
      return rows;
    },
    async save(_deckId, pictures) {
      if (!pictures.length) return;
      // A sheet's pictures land together or not at all.
      await db.transaction(async (tx) => {
        const rows = await tx.insert(cardPictures).values(pictures.map((p) => ({ data: p.data }))).returning({ id: cardPictures.id });
        for (const [i, p] of pictures.entries()) await tx.update(cards).set({ pictureId: rows[i]!.id }).where(eq(cards.id, p.cardId));
      });
    },
    async finish(deckId, status) {
      // Only a run that is still open is closed, so a late second run cannot turn "ready" into "failed".
      await db.update(decks).set({ picturesStatus: status }).where(and(eq(decks.id, deckId), eq(decks.picturesStatus, 'making')));
    },
    async read(id) {
      const [row] = await db.select({ data: cardPictures.data }).from(cardPictures).where(eq(cardPictures.id, id));
      return row?.data ?? null;
    },
  };
}
