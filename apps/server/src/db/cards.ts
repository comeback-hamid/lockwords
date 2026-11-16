import { and, desc, eq } from 'drizzle-orm';

import type { CardsStore } from '../app.js';
import { pickRound } from '../review/srs.js';
import type { createDb } from './client.js';
import { cards, decks, profiles } from './schema.js';

export function createCardsStore(db: ReturnType<typeof createDb>['db']): CardsStore {
  // Cards joined to their deck. Every query below also filters decks.user_id, so a user only reaches their own cards.
  const mine = () =>
    db
      .select({ card: cards, deckTopic: decks.topic, deckCreatedAt: decks.createdAt })
      .from(cards)
      .innerJoin(decks, eq(cards.deckId, decks.id));
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
      // shortcut: loads all of the user's live cards and picks in memory; fine for hundreds, add SQL limits later.
      const rows = await mine().where(and(eq(decks.userId, userId), eq(decks.status, 'ready'), eq(cards.known, false)));
      return pickRound(rows.map((r) => ({ ...toCard(r), deckCreatedAt: r.deckCreatedAt, position: r.card.position })), now);
    },
    async get(userId, id) {
      const [row] = await mine().where(and(eq(decks.userId, userId), eq(cards.id, id)));
      return row ? toCard(row) : null;
    },
    async save(id, patch) {
      await db.update(cards).set(patch).where(eq(cards.id, id));
    },
    async hardWords(userId) {
      const rows = await mine()
        .where(and(eq(decks.userId, userId), eq(cards.hard, true), eq(cards.known, false)))
        .orderBy(desc(cards.createdAt), desc(cards.position))
        .limit(20);
      return rows.map((r) => ({ word: r.card.word, translation: r.card.translation }));
    },
    async languages(userId) {
      const [p] = await db.select({ learningLanguage: profiles.learningLanguage, nativeLanguage: profiles.nativeLanguage }).from(profiles).where(eq(profiles.userId, userId));
      return p ?? { learningLanguage: '', nativeLanguage: '' };
    },
  };
}
