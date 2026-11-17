import { and, asc, desc, eq, gt, gte, inArray, lte, sql } from 'drizzle-orm';

import type { KaiMessage, KaiStore } from '../kai/chat.js';
import type { createDb } from './client.js';
import { cards, decks, kaiMessages, kaiNotes, profiles } from './schema.js';

const DAY_MS = 24 * 60 * 60 * 1000;

export function createKaiStore(db: ReturnType<typeof createDb>['db']): KaiStore {
  const toMessage = (r: typeof kaiMessages.$inferSelect): KaiMessage => ({
    id: r.id,
    from: r.role === 'user' ? 'user' : 'kai',
    text: r.text,
    translation: r.translation,
    options: r.options,
    opening: r.opening,
    createdAt: r.createdAt,
  });
  return {
    async messages(userId, limit) {
      const rows = await db.select().from(kaiMessages).where(eq(kaiMessages.userId, userId)).orderBy(desc(kaiMessages.createdAt), desc(kaiMessages.position)).limit(limit);
      return rows.reverse().map(toMessage);
    },
    async lastOpeningAt(userId) {
      const [row] = await db
        .select({ at: kaiMessages.createdAt })
        .from(kaiMessages)
        .where(and(eq(kaiMessages.userId, userId), eq(kaiMessages.opening, true)))
        .orderBy(desc(kaiMessages.createdAt))
        .limit(1);
      return row?.at ?? null;
    },
    async userTurnsSince(userId, since) {
      const [row] = await db
        .select({ n: sql<number>`count(*)::int` })
        .from(kaiMessages)
        .where(and(eq(kaiMessages.userId, userId), eq(kaiMessages.role, 'user'), gte(kaiMessages.createdAt, since)));
      return row?.n ?? 0;
    },
    async notes(userId) {
      const rows = await db.select({ text: kaiNotes.text }).from(kaiNotes).where(eq(kaiNotes.userId, userId)).orderBy(asc(kaiNotes.createdAt), asc(kaiNotes.id));
      return rows.map((r) => r.text);
    },
    async facts(userId, now) {
      // Only cards the learner can meet in Review: ready decks, not marked "I know it".
      const live = and(eq(decks.userId, userId), eq(decks.status, 'ready'), eq(cards.known, false));
      const mine = () => db.select({ n: sql<number>`count(*)::int` }).from(cards).innerJoin(decks, eq(cards.deckId, decks.id));
      const [[p], [total], [reviewed], [due], sample] = await Promise.all([
        db.select({ name: profiles.name, on: profiles.kaiTranslationOn }).from(profiles).where(eq(profiles.userId, userId)),
        mine().where(live),
        mine().where(and(live, gt(cards.lastReviewedAt, new Date(now.getTime() - DAY_MS)), lte(cards.lastReviewedAt, now))),
        mine().where(and(live, gt(cards.stage, 0), lte(cards.dueAt, now))),
        db
          .select({ word: cards.word, translation: cards.translation })
          .from(cards)
          .innerJoin(decks, eq(cards.deckId, decks.id))
          .where(live)
          .orderBy(desc(cards.hard), desc(cards.createdAt), asc(cards.position))
          .limit(10),
      ]);
      return { name: p?.name ?? null, translationOn: p?.on ?? null, words: { total: total?.n ?? 0, reviewedLastDay: reviewed?.n ?? 0, dueNow: due?.n ?? 0, sample } };
    },
    async setTranslation(userId, on) {
      const rows = await db.update(profiles).set({ kaiTranslationOn: on }).where(eq(profiles.userId, userId)).returning({ id: profiles.userId });
      return rows.length > 0;
    },
    async addTurn(userId, turn, now) {
      // The learner's message, Kai's lines and the notes land together or not at all.
      return db.transaction(async (tx) => {
        const values = [
          ...(turn.user === null ? [] : [{ role: 'user', text: turn.user, translation: null as string | null, options: [] as string[] }]),
          ...turn.kai.map((l, i) => ({ role: 'kai', text: l.text, translation: l.translation as string | null, options: i === turn.kai.length - 1 ? turn.options : [] })),
        ].map((v, position) => ({ ...v, userId, position, opening: turn.opening, createdAt: now }));
        const rows = (await tx.insert(kaiMessages).values(values).returning()).sort((a, b) => a.position - b.position).map(toMessage);
        if (turn.notes.drop > 0) {
          const oldest = await tx.select({ id: kaiNotes.id }).from(kaiNotes).where(eq(kaiNotes.userId, userId)).orderBy(asc(kaiNotes.createdAt), asc(kaiNotes.id)).limit(turn.notes.drop);
          if (oldest.length) await tx.delete(kaiNotes).where(inArray(kaiNotes.id, oldest.map((o) => o.id)));
        }
        // One millisecond apart, so "oldest first" is the order they were said in.
        if (turn.notes.add.length) await tx.insert(kaiNotes).values(turn.notes.add.map((text, i) => ({ userId, text, createdAt: new Date(now.getTime() + i) })));
        return { userMessage: turn.user === null ? null : rows[0]!, messages: turn.user === null ? rows : rows.slice(1) };
      });
    },
  };
}
