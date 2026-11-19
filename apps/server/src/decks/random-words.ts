import { and, desc, eq, sql } from 'drizzle-orm';

import type { createDb } from '../db/client.js';
import { cards, decks, kaiMessages, profiles } from '../db/schema.js';
import { cardExample } from '../kai/abilities/words.js';

// "Random Words N": decks for single words the learner keeps from the chat. The server makes them; the learner never picks one.
// A word goes to the newest Random Words deck with room. When there is none, a new one starts with the next number.

export const RANDOM_DECK_SIZE = 30;
export const randomDeckTitle = (n: number) => `Random Words ${n}`;

// `existing`: the user's Random Words decks, newest first. `id: null` = make deck number `number`.
export function pickRandomDeck(existing: readonly { id: string; count: number }[]): { id: string | null; number: number } {
  const at = existing.findIndex((d) => d.count < RANDOM_DECK_SIZE);
  return at < 0 ? { id: null, number: existing.length + 1 } : { id: existing[at]!.id, number: existing.length - at };
}

export type AddWordResult = { deckId: string; deckTitle: string; count: number; already: boolean };
export type RandomWordsStore = {
  // Adds the word of one Kai message. Safe to repeat: the second call gives the first result.
  add(userId: string, messageId: string): Promise<{ ok: true; result: AddWordResult } | { ok: false; error: 'not_found' | 'no_word' }>;
};

type Db = ReturnType<typeof createDb>['db'];
type Reader = Pick<Db, 'select'>; // the database or a transaction

const randomDecksOf = (db: Reader, userId: string) =>
  db
    .select({ id: decks.id, count: sql<number>`(select count(*)::int from cards where cards.deck_id = decks.id)` /* plain names: Drizzle drops the table name inside a one-table select */ })
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

        const save = async (result: AddWordResult) => {
          await tx.update(kaiMessages).set({ word: { ...word, result } }).where(eq(kaiMessages.id, messageId));
          return { ok: true as const, result };
        };
        const countIn = async (deckId: string) => (await tx.select({ n: sql<number>`count(*)::int` }).from(cards).where(eq(cards.deckId, deckId)))[0]?.n ?? 0;

        // Already in the learner's words (any deck, capital letters ignored): nothing is added.
        const [have] = await tx
          .select({ deckId: decks.id, deckTitle: decks.title })
          .from(cards)
          .innerJoin(decks, eq(cards.deckId, decks.id))
          .where(and(eq(decks.userId, userId), sql`lower(${cards.word}) = lower(${word.word})`))
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
        const position = await countIn(deckId);
        await tx.insert(cards).values({ deckId, position, word: word.word, translation: word.translation, example: cardExample(word.example), exampleTranslation: word.exampleTranslation });
        return save({ deckId, deckTitle: title, count: position + 1, already: false });
      });
    },
  };
}
