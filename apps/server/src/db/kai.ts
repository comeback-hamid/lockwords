import { and, asc, desc, eq, gt, gte, inArray, isNull, lte, sql } from 'drizzle-orm';

import { toChatDecks } from '../kai/abilities/decks.js';
import { nextRandomDeckTitle } from '../decks/random-words.js';
import { OPENING_GAP_MS, type KaiMessage, type KaiStore } from '../kai/chat.js';
import { MAX_NEW_PER_ROUND } from '../review/srs.js';
import type { createDb } from './client.js';
import { cards, decks, kaiMessages, kaiNotes, profiles } from './schema.js';

const DAY_MS = 24 * 60 * 60 * 1000;

export function createKaiStore(db: ReturnType<typeof createDb>['db']): KaiStore {
  type Row = typeof kaiMessages.$inferSelect;
  // Rows → messages. A word card also says which Random Words deck takes it now (or took it) and what happened to it.
  const toMessages = async (reader: Pick<typeof db, 'select'>, userId: string, rows: Row[]): Promise<KaiMessage[]> => {
    const next = rows.some((r) => r.word && !r.word.result) ? await nextRandomDeckTitle(reader, userId) : '';
    return rows.map((r) => {
      if (!r.word) return toMessage(r);
      const { result, ...word } = r.word;
      return { ...toMessage(r), word: { ...word, addTo: result?.deckTitle ?? next, added: result ? !result.already : false, already: result?.already ?? false } };
    });
  };
  // Ability "decks": the deck cards under each line. `current` = the user's newest line that has decks.
  async function withDecks(tx: Pick<typeof db, 'select'>, userId: string, rows: Row[]): Promise<KaiMessage[]> {
    const messages = await toMessages(tx, userId, rows);
    const ids = rows.flatMap((r) => r.deckIds);
    if (ids.length === 0) return messages;
    const [found, [newest]] = await Promise.all([
      tx.select().from(decks).where(and(eq(decks.userId, userId), inArray(decks.id, ids), isNull(decks.removedAt))), // a removed deck is left out of the chat
      tx
        .select({ id: kaiMessages.id })
        .from(kaiMessages)
        .where(and(eq(kaiMessages.userId, userId), sql`cardinality(${kaiMessages.deckIds}) > 0`))
        .orderBy(desc(kaiMessages.createdAt), desc(kaiMessages.position))
        .limit(1),
    ]);
    const byId = new Map(found.map((d) => [d.id, d]));
    return rows.map((r, i) => (r.deckIds.length ? { ...messages[i]!, decks: toChatDecks(r.deckIds, byId, r.id === newest?.id) } : messages[i]!));
  }
  const toMessage = (r: Row): KaiMessage => ({
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
      return withDecks(db, userId, rows.reverse());
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
      // Cards the learner can meet in Review: ready decks, not marked "I know it".
      const ready = and(eq(decks.userId, userId), eq(decks.status, 'ready'), isNull(decks.removedAt), isNull(cards.removedAt)); // removed cards and decks do not count
      const live = and(ready, eq(cards.known, false));
      const mine = () => db.select({ n: sql<number>`count(*)::int` }).from(cards).innerJoin(decks, eq(cards.deckId, decks.id));
      const [[p], [total], [reviewed], [due], [fresh], sample] = await Promise.all([
        db.select({ name: profiles.name, on: profiles.kaiTranslationOn }).from(profiles).where(eq(profiles.userId, userId)),
        mine().where(live),
        // "I know it" is practice too, so known cards count here.
        mine().where(and(ready, gt(cards.lastReviewedAt, new Date(now.getTime() - DAY_MS)), lte(cards.lastReviewedAt, now))),
        mine().where(and(live, gt(cards.stage, 0), lte(cards.dueAt, now))),
        mine().where(and(live, eq(cards.stage, 0))),
        db
          .select({ word: cards.word, translation: cards.translation })
          .from(cards)
          .innerJoin(decks, eq(cards.deckId, decks.id))
          .where(live)
          .orderBy(desc(cards.hard), desc(cards.createdAt), asc(cards.position))
          .limit(10),
      ]);
      // Ability "decks": the newest topics the learner has, and the ideas that were only offered.
      const topics = (status: 'made' | 'offered') =>
        db
          .select({ topic: decks.topic })
          .from(decks)
          .where(and(eq(decks.userId, userId), isNull(decks.removedAt), status === 'made' ? inArray(decks.status, ['ready', 'generating']) : eq(decks.status, 'proposed')))
          .orderBy(desc(decks.createdAt))
          .limit(status === 'made' ? 30 : 15);
      const [made, offered] = await Promise.all([topics('made'), topics('offered')]);
      const deckFacts = { newWordsLeft: fresh?.n ?? 0, topics: made.map((d) => d.topic), offered: offered.map((d) => d.topic) };
      return { name: p?.name ?? null, translationOn: p?.on ?? null, decks: deckFacts, words: { total: total?.n ?? 0, reviewedLastDay: reviewed?.n ?? 0, dueNow: (due?.n ?? 0) + Math.min(fresh?.n ?? 0, MAX_NEW_PER_ROUND), sample } }; // what Review shows today: due cards plus the new ones of a round
    },
    async setTranslation(userId, on) {
      const rows = await db.update(profiles).set({ kaiTranslationOn: on }).where(eq(profiles.userId, userId)).returning({ id: profiles.userId });
      return rows.length > 0;
    },
    async saidReady(userId, deckId) {
      const [row] = await db.select({ id: kaiMessages.id }).from(kaiMessages).where(and(eq(kaiMessages.userId, userId), eq(kaiMessages.readyDeckId, deckId))).limit(1);
      return row !== undefined;
    },
    async addTurn(userId, turn, now) {
      // The learner's message, Kai's lines and the notes land together or not at all.
      return db.transaction(async (tx) => {
        // One turn at a time per user: two requests at once cannot both open the chat or save the same note twice.
        await tx.execute(sql`select pg_advisory_xact_lock(hashtext(${userId}))`);
        if (turn.opening) {
          const [last] = await tx
            .select({ at: kaiMessages.createdAt })
            .from(kaiMessages)
            .where(and(eq(kaiMessages.userId, userId), eq(kaiMessages.opening, true)))
            .orderBy(desc(kaiMessages.createdAt))
            .limit(1);
          if (last && now.getTime() - last.at.getTime() < OPENING_GAP_MS) return { userMessage: null, messages: [] };
        }
        if (turn.readyDeckId) {
          // Two "ready" events at once: Kai says it once.
          const [said] = await tx.select({ id: kaiMessages.id }).from(kaiMessages).where(and(eq(kaiMessages.userId, userId), eq(kaiMessages.readyDeckId, turn.readyDeckId))).limit(1);
          if (said) return { userMessage: null, messages: [] };
        }
        // Deck ideas become proposed decks, in the order Kai gave them.
        const ideas = turn.decks?.ideas ?? [];
        const deckIds: string[] = [];
        for (const d of ideas) {
          const [row] = await tx.insert(decks).values({ userId, topic: d.topic, title: d.title, titleTranslation: d.titleTranslation, reason: d.reason, cefr: turn.decks!.cefr, wordCount: d.wordCount, createdAt: now }).returning({ id: decks.id });
          deckIds.push(row!.id);
        }
        const saved = new Set((await tx.select({ text: kaiNotes.text }).from(kaiNotes).where(eq(kaiNotes.userId, userId))).map((n) => n.text));
        const notesToAdd = turn.notes.add.filter((n) => !saved.has(n));
        const values = [
          ...(turn.user === null ? [] : [{ role: 'user', text: turn.user, translation: null as string | null, options: [] as string[], word: null }]),
          ...turn.kai.map((l, i) => ({ role: 'kai', text: l.text, translation: l.translation as string | null, options: i === turn.kai.length - 1 ? turn.options : [], word: i === turn.kai.length - 1 ? (turn.word ?? null) : null })),
        ].map((v, position) => ({ ...v, userId, position, opening: turn.opening, createdAt: now, deckIds: [] as string[], readyDeckId: null as string | null }));
        // Kai's last line carries the turn's deck cards and the "ready" mark.
        const last = values.at(-1)!;
        last.deckIds = deckIds;
        last.readyDeckId = turn.readyDeckId ?? null;
        const rows = await withDecks(tx, userId, (await tx.insert(kaiMessages).values(values).returning()).sort((a, b) => a.position - b.position));
        if (turn.notes.drop > 0) {
          const oldest = await tx.select({ id: kaiNotes.id }).from(kaiNotes).where(eq(kaiNotes.userId, userId)).orderBy(asc(kaiNotes.createdAt), asc(kaiNotes.id)).limit(turn.notes.drop);
          if (oldest.length) await tx.delete(kaiNotes).where(inArray(kaiNotes.id, oldest.map((o) => o.id)));
        }
        // One millisecond apart, so "oldest first" is the order they were said in.
        if (notesToAdd.length) await tx.insert(kaiNotes).values(notesToAdd.map((text, i) => ({ userId, text, createdAt: new Date(now.getTime() + i) })));
        return { userMessage: turn.user === null ? null : rows[0]!, messages: turn.user === null ? rows : rows.slice(1) };
      });
    },
  };
}
