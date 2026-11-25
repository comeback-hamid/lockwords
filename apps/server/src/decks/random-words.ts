import { and, desc, eq, isNull, sql } from 'drizzle-orm';

import type { createDb } from '../db/client.js';
import { cards, decks, kaiMessages, profiles } from '../db/schema.js';
import { cardExample } from '../kai/abilities/words.js';

// "Random Words N": decks for single words the learner keeps from the chat. The server makes them; the learner never picks one.
// A word goes to the newest Random Words deck with room. When there is none, a new one starts with the next number.

export const RANDOM_DECK_SIZE = 30;
export const randomDeckTitle = (n: number) => `Random Words ${n}`;

// `existing`: every Random Words deck the user ever had, newest first. `id: null` = make deck number `number`.
// A removed deck never takes a word, but it keeps its number: a title is never used twice.
export function pickRandomDeck(existing: readonly { id: string; count: number; removed?: boolean }[]): { id: string | null; number: number } {
  const at = existing.findIndex((d) => !d.removed && d.count < RANDOM_DECK_SIZE);
  return at < 0 ? { id: null, number: existing.length + 1 } : { id: existing[at]!.id, number: existing.length - at };
}

export type AddWordResult = { deckId: string; deckTitle: string; count: number; already: boolean };
export type RandomWordsStore = {
  // Adds the word of one Kai message. Safe to repeat: the second call gives the first result.
  // `cardId`: the card this call made (none when nothing was added). The route starts its picture (decks/word-pictures.ts).
  add(userId: string, messageId: string): Promise<{ ok: true; result: AddWordResult; cardId?: string } | { ok: false; error: 'not_found' | 'no_word' }>;
};

type Db = ReturnType<typeof createDb>['db'];
type Reader = Pick<Db, 'select'>; // the database or a transaction

const randomDecksOf = (db: Reader, userId: string) =>
  db
    .select({
      id: decks.id,
      count: sql<number>`(select count(*)::int from cards where cards.deck_id = decks.id and cards.removed_at is null)` /* plain names: Drizzle drops the table name inside a one-table select */,
      removed: sql<boolean>`decks.removed_at is not null`,
    })
    .from(decks)
    .where(and(eq(decks.userId, userId), eq(decks.kind, 'random')))
    .orderBy(desc(decks.createdAt), desc(decks.title));

// The title of the deck that would take a word right now. The chat shows it on the Add button.
export async function nextRandomDeckTitle(db: Reader, userId: string): Promise<string> {
  return randomDeckTitle(pickRandomDeck(await randomDecksOf(db, userId)).number);
}

export function createRandomWordsStore(db: Db): RandomWordsStore {
  return {
    async add(userId, messageId) {
      return db.transaction(async (tx) => {
        // One at a time per user (the same lock as a chat turn): two fast taps cannot make two decks or a 31st card.
        await tx.execute(sql`select pg_advisory_xact_lock(hashtext(${userId}))`);
        const [message] = await tx.select({ word: kaiMessages.word }).from(kaiMessages).where(and(eq(kaiMessages.id, messageId), eq(kaiMessages.userId, userId)));
        if (!message) return { ok: false as const, error: 'not_found' as const };
        const word = message.word;
        if (!word) return { ok: false as const, error: 'no_word' as const };
        if (word.result) return { ok: true as const, result: word.result };

        const save = async (result: AddWordResult, cardId?: string) => {
          await tx.update(kaiMessages).set({ word: { ...word, result } }).where(eq(kaiMessages.id, messageId));
          return { ok: true as const, result, cardId };
        };
        // Cards the learner still has in a deck, and the place for a new one (after every card, removed ones too, so the order holds).
        const countIn = async (deckId: string) => (await tx.select({ n: sql<number>`count(*)::int` }).from(cards).where(and(eq(cards.deckId, deckId), isNull(cards.removedAt))))[0]?.n ?? 0;
        const nextPosition = async (deckId: string) => (await tx.select({ n: sql<number>`coalesce(max(${cards.position}) + 1, 0)::int` }).from(cards).where(eq(cards.deckId, deckId)))[0]?.n ?? 0;

        // Already in the learner's words (any deck, capital letters ignored): nothing is added.
        const [have] = await tx
          .select({ deckId: decks.id, deckTitle: decks.title })
          .from(cards)
          .innerJoin(decks, eq(cards.deckId, decks.id))
          .where(and(eq(decks.userId, userId), isNull(decks.removedAt), isNull(cards.removedAt), sql`lower(${cards.word}) = lower(${word.word})`))
          .limit(1);
        if (have) return save({ ...have, count: await countIn(have.deckId), already: true });

        const target = pickRandomDeck(await randomDecksOf(tx, userId));
        const title = randomDeckTitle(target.number);
        let deckId = target.id;
        if (!deckId) {
          const [profile] = await tx.select({ cefr: profiles.cefr }).from(profiles).where(eq(profiles.userId, userId));
          const [made] = await tx
            .insert(decks)
            .values({ userId, topic: title, title, reason: 'Single words you saved.', cefr: profile?.cefr ?? 'A1', status: 'ready', kind: 'random' })
            .returning({ id: decks.id });
          deckId = made!.id;
        }
        const [card] = await tx
          .insert(cards)
          .values({ deckId, position: await nextPosition(deckId), word: word.word, translation: word.translation, example: cardExample(word.example), exampleTranslation: word.exampleTranslation })
          .returning({ id: cards.id });
        return save({ deckId, deckTitle: title, count: await countIn(deckId), already: false }, card!.id);
      });
    },
  };
}
