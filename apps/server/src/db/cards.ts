import { and, asc, desc, eq, gt, isNull, lte, sql } from 'drizzle-orm';

import type { CardsStore } from '../app.js';
import { MAX_NEW_PER_ROUND, pickRound } from '../review/srs.js';
import type { createDb } from './client.js';
import { cards, decks, profiles } from './schema.js';

export function createCardsStore(db: ReturnType<typeof createDb>['db']): CardsStore {
  // Cards joined to their deck. Every query below also filters decks.user_id, so a user only reaches their own cards.
  const mine = () =>
    db
      .select({ card: cards, deckTopic: decks.topic, deckCreatedAt: decks.createdAt })
      .from(cards)
      .innerJoin(decks, eq(cards.deckId, decks.id));
  // The user's cards that are not removed (alone or with their deck). Every read below starts from this.
  const kept = (userId: string) => and(eq(decks.userId, userId), isNull(decks.removedAt), isNull(cards.removedAt));
  const toCard = (r: { card: typeof cards.$inferSelect; deckTopic: string }) => ({
    id: r.card.id,
    deckId: r.card.deckId,
    deckTopic: r.deckTopic,
    word: r.card.word,
    translation: r.card.translation,
    example: r.card.example,
    exampleTranslation: r.card.exampleTranslation,
    stage: r.card.stage,
    known: r.card.known,
    hard: r.card.hard,
    dueAt: r.card.dueAt,
  });
  return {
    async round(userId, now) {
      // The database picks the rows (due cards, and the first 20 new ones); pickRound owns the final order.
      const live = and(kept(userId), eq(decks.status, 'ready'), eq(cards.known, false));
      const [due, fresh] = await Promise.all([
        mine().where(and(live, gt(cards.stage, 0), lte(cards.dueAt, now))),
        mine().where(and(live, eq(cards.stage, 0))).orderBy(asc(decks.createdAt), asc(cards.position)).limit(MAX_NEW_PER_ROUND),
      ]);
      return pickRound([...due, ...fresh].map((r) => ({ ...toCard(r), deckCreatedAt: r.deckCreatedAt, position: r.card.position })), now);
    },
    async get(userId, id) {
      const [row] = await mine().where(and(kept(userId), eq(cards.id, id)));
      return row ? toCard(row) : null;
    },
    async save(id, patch) {
      // Every save is a swipe or a good Use it sentence, so it also counts as practice.
      await db.update(cards).set({ ...patch, lastReviewedAt: new Date() }).where(eq(cards.id, id));
    },
    async hardWords(userId) {
      const rows = await mine()
        .where(and(kept(userId), eq(cards.hard, true), eq(cards.known, false)))
        .orderBy(desc(cards.createdAt), desc(cards.position))
        .limit(20);
      return rows.map((r) => ({ word: r.card.word, translation: r.card.translation }));
    },
    async remove(userId, id) {
      return db.transaction(async (tx) => {
        const [found] = await tx
          .select({ deckId: cards.deckId, kind: decks.kind })
          .from(cards)
          .innerJoin(decks, eq(cards.deckId, decks.id))
          .where(and(kept(userId), eq(cards.id, id)));
        if (!found) return false;
        const gone = await tx.update(cards).set({ removedAt: new Date() }).where(and(eq(cards.id, id), isNull(cards.removedAt))).returning({ id: cards.id });
        if (gone.length === 0) return false; // two removals at once: the second finds nothing
        // The deck's size follows, so every place that shows it (the deck, its card in the chat) is right. A Random Words deck counts its cards itself.
        if (found.kind !== 'random') await tx.update(decks).set({ wordCount: sql`(select count(*)::int from cards c where c.deck_id = ${found.deckId} and c.removed_at is null)` }).where(eq(decks.id, found.deckId));
        return true;
      });
    },
    async languages(userId) {
      const [p] = await db.select({ learningLanguage: profiles.learningLanguage, nativeLanguage: profiles.nativeLanguage }).from(profiles).where(eq(profiles.userId, userId));
      return p ?? { learningLanguage: '', nativeLanguage: '' };
    },
  };
}
