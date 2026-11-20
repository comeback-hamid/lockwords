import { and, asc, desc, eq, gt, inArray, isNull, lt, lte, sql } from 'drizzle-orm';

import type { CardsStore } from '../app.js';
import type { TodayEvent } from '../review/summary.js';
import { MAX_NEW_PER_DAY, pickRound, type CardState, type Direction } from '../review/srs.js';
import type { createDb } from './client.js';
import { cards, decks, profiles, reviewEvents, type ReviewEventState } from './schema.js';

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
  const toState = (c: CardState): ReviewEventState => ({ stage: c.stage, known: c.known, hard: c.hard, dueAt: c.dueAt ? c.dueAt.toISOString() : null });
  // The learner's history rows of one review day that were not taken back, oldest first.
  const todaysEvents = (userId: string, day: string) =>
    db
      .select({ cardId: reviewEvents.cardId, kind: reviewEvents.kind, before: reviewEvents.before })
      .from(reviewEvents)
      .where(and(eq(reviewEvents.userId, userId), eq(reviewEvents.reviewDay, day), isNull(reviewEvents.undoneAt)))
      .orderBy(asc(reviewEvents.createdAt));
  return {
    async round(userId, now, today) {
      // The database picks the rows; pickRound owns the final order. With `today`, a card is due for its whole review
      // day and new cards stop at the daily limit. Without it (callers with no history): due by the clock, 20 new.
      const live = and(kept(userId), eq(decks.status, 'ready'), eq(cards.known, false));
      const events = today ? await todaysEvents(userId, today.day) : [];
      const newLeft = MAX_NEW_PER_DAY - new Set(events.filter((e) => e.before.stage === 0).map((e) => e.cardId)).size;
      // After a first Hard the card is shown once more today, at the end of the round.
      const perCard = new Map<string, string[]>();
      for (const e of events) perCard.set(e.cardId, [...(perCard.get(e.cardId) ?? []), e.kind]);
      const againIds = [...perCard].filter(([, kinds]) => kinds.length === 1 && kinds[0] === 'hard').map(([id]) => id);
      const [due, fresh, again] = await Promise.all([
        mine().where(and(live, gt(cards.stage, 0), today ? lt(cards.dueAt, today.end) : lte(cards.dueAt, now))),
        newLeft > 0 ? mine().where(and(live, eq(cards.stage, 0))).orderBy(asc(decks.createdAt), asc(cards.position)).limit(newLeft) : [],
        againIds.length ? mine().where(and(live, inArray(cards.id, againIds))) : [],
      ]);
      const picked = pickRound([...due, ...fresh].map((r) => ({ ...toCard(r), deckCreatedAt: r.deckCreatedAt, position: r.card.position })), today?.end ?? now, Math.max(0, newLeft));
      const inRound = new Set(picked.map((c) => c.id));
      return [...picked, ...again.filter((r) => !inRound.has(r.card.id)).map((r) => ({ ...toCard(r), deckCreatedAt: r.deckCreatedAt, position: r.card.position }))];
    },
    async today(userId, cardId, day) {
      const events = await todaysEvents(userId, day);
      return {
        swipesToday: events.filter((e) => e.cardId === cardId && e.kind !== 'use_it').map((e) => e.kind as Direction),
        newStartedToday: new Set(events.filter((e) => e.before.stage === 0).map((e) => e.cardId)).size,
      };
    },
    async saveSwipe(userId, cardId, event) {
      // The card and its history row land together or not at all.
      await db.transaction(async (tx) => {
        await tx.update(cards).set({ ...event.after, lastReviewedAt: event.at }).where(eq(cards.id, cardId));
        await tx.insert(reviewEvents).values({ userId, cardId, kind: event.kind, reviewDay: event.day, before: toState(event.before), after: toState(event.after), createdAt: event.at });
      });
    },
    async undoLast(userId, day) {
      return db.transaction(async (tx) => {
        // The newest row of the day, undone or not: right after an undo there is nothing more to take back.
        const [last] = await tx
          .select()
          .from(reviewEvents)
          .where(and(eq(reviewEvents.userId, userId), eq(reviewEvents.reviewDay, day)))
          .orderBy(desc(reviewEvents.createdAt))
          .limit(1);
        if (!last || last.undoneAt || last.kind === 'use_it') return null;
        const b = last.before;
        await tx.update(cards).set({ stage: b.stage, known: b.known, hard: b.hard, dueAt: b.dueAt ? new Date(b.dueAt) : null }).where(eq(cards.id, last.cardId));
        await tx.update(reviewEvents).set({ undoneAt: new Date() }).where(eq(reviewEvents.id, last.id));
        const [row] = await tx
          .select({ card: cards, deckTopic: decks.topic })
          .from(cards)
          .innerJoin(decks, eq(cards.deckId, decks.id))
          .where(and(kept(userId), eq(cards.id, last.cardId)));
        return row ? toCard(row) : null; // null: the card was removed after the swipe
      });
    },
    async history(userId, day) {
      const live = and(eq(reviewEvents.userId, userId), isNull(reviewEvents.undoneAt));
      const [[profile], dayRows, rows] = await Promise.all([
        db.select({ name: profiles.name }).from(profiles).where(eq(profiles.userId, userId)),
        db.selectDistinct({ day: reviewEvents.reviewDay }).from(reviewEvents).where(live).orderBy(desc(reviewEvents.reviewDay)).limit(1000),
        db
          .select({ cardId: reviewEvents.cardId, kind: reviewEvents.kind, at: reviewEvents.createdAt, after: reviewEvents.after })
          .from(reviewEvents)
          .where(and(live, eq(reviewEvents.reviewDay, day)))
          .orderBy(asc(reviewEvents.createdAt)),
      ]);
      return {
        name: profile?.name ?? null,
        days: dayRows.map((r) => r.day),
        events: rows.map((r) => ({ cardId: r.cardId, kind: r.kind as TodayEvent['kind'], at: r.at, stage: r.after.stage })),
      };
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
