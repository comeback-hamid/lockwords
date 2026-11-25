import type { PgBoss } from 'pg-boss';

import { sheetSizes } from '../llm/deck-pictures.js';
import { drawSheet, type PictureDeps } from './pictures.js';

// The picture of a single word in a "Random Words N" deck. The word is saved first (decks/random-words.ts); its picture
// is drawn after, in a job, and shows when it is there. A failed picture loses nothing: the word stays, with no picture.
//
// With `cardId`: that one card, as one small image (a new word; about 13 s). One bad word never holds up another.
// Without: every word of the deck that has no picture, on one sheet like a generated deck (older words; the cheapest
// way per word). Cards that already have a picture are skipped, so a job that runs twice draws nothing twice.
// Never throws. false = at least one picture was not made.
export async function drawWordPictures(deps: PictureDeps, deckId: string, cardId?: string): Promise<boolean> {
  try {
    const todo = await deps.pictures.todo(deckId, cardId);
    if (!todo.length) return true;
    let at = 0;
    const sheets = sheetSizes(todo.length).map((size) => todo.slice(at, (at += size)));
    return (await Promise.all(sheets.map((items) => drawSheet(deps, deckId, items)))).every(Boolean);
  } catch {
    return false;
  }
}

// `start` only hands the work over; it never waits for the picture. No `cardId` = the deck's older words.
// `idle` (the inline runner only): resolves when the pictures started so far are done. Tests wait on it.
export type WordPictureJobs = { start(deckId: string, cardId?: string): Promise<void>; idle?(): Promise<void> };

// No queue (tests, and any setup without one): the picture is drawn in this process, after `start` returns.
export function inlineWordPictureJobs(deps: PictureDeps): WordPictureJobs {
  let drawing: Promise<unknown> = Promise.resolve();
  return {
    async start(deckId, cardId) {
      drawing = drawing.then(() => drawWordPictures(deps, deckId, cardId));
    },
    idle: () => drawing.then(() => {}),
  };
}

// Two queues, so a long run over older words never makes a new word wait.
export const WORD_PICTURE_QUEUE = 'word-picture';
export const WORD_PICTURES_BACKFILL_QUEUE = 'word-pictures-backfill';
type Data = { deckId: string; cardId?: string };
// If the server stops mid-job, pg-boss runs the job again when it is back. A failed picture is not tried again by the queue.
const SEND = { retryLimit: 2, expireInSeconds: 300 } as const;

export const sendWordPictureBackfill = (boss: PgBoss, deckId: string) => boss.send(WORD_PICTURES_BACKFILL_QUEUE, { deckId } satisfies Data, SEND);

// The real queue (pg-boss, in our Postgres). Starts the workers and returns the way to add jobs.
export async function createQueuedWordPictureJobs(boss: PgBoss, deps: PictureDeps): Promise<WordPictureJobs> {
  await boss.createQueue(WORD_PICTURE_QUEUE);
  await boss.createQueue(WORD_PICTURES_BACKFILL_QUEUE);
  // New words: a few at the same time, so three quick adds do not wait in a line.
  await boss.work<Data>(WORD_PICTURE_QUEUE, { pollingIntervalSeconds: 0.5, batchSize: 4 }, async (jobs) => {
    await Promise.all(jobs.map((job) => drawWordPictures(deps, job.data.deckId, job.data.cardId)));
  });
  // Older words: one deck at a time.
  await boss.work<Data>(WORD_PICTURES_BACKFILL_QUEUE, { pollingIntervalSeconds: 2 }, async ([job]) => {
    if (job) await drawWordPictures(deps, job.data.deckId);
  });
  return {
    async start(deckId, cardId) {
      if (cardId) await boss.send(WORD_PICTURE_QUEUE, { deckId, cardId } satisfies Data, SEND);
      else await sendWordPictureBackfill(boss, deckId);
    },
  };
}
