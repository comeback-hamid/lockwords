import { and, eq } from 'drizzle-orm';
import type { PgBoss } from 'pg-boss';

import type { createDb } from '../db/client.js';
import { decks } from '../db/schema.js';
import { makeDeckCards, type DeckJobDeps, type DeckJobs } from './jobs.js';

const QUEUE = 'make-deck';
type Data = { userId: string; deckId: string };

// The real queue (pg-boss, in our Postgres). Starts the worker and returns the way to add jobs.
// The deck's status tells the story: proposed → generating → ready, or back to proposed when the job fails.
export async function createQueuedDeckJobs(boss: PgBoss, db: ReturnType<typeof createDb>['db'], deps: DeckJobDeps): Promise<DeckJobs> {
  const setStatus = (deckId: string, from: string, to: string) =>
    db.update(decks).set({ status: to }).where(and(eq(decks.id, deckId), eq(decks.status, from))).returning({ id: decks.id });

  await boss.createQueue(QUEUE);
  await boss.work<Data>(QUEUE, { pollingIntervalSeconds: 0.5 }, async ([job]) => {
    if (!job) return;
    const ok = await makeDeckCards(deps, job.data.userId, job.data.deckId);
    if (!ok) await setStatus(job.data.deckId, 'generating', 'proposed');
  });
  return {
    async start(userId, deckId) {
      // Only the call that moves the deck to generating adds a job, so two taps make one job.
      const [moved] = await setStatus(deckId, 'proposed', 'generating');
      // If the server stops mid-job, pg-boss runs the job again when it is back.
      if (moved) await boss.send(QUEUE, { userId, deckId } satisfies Data, { retryLimit: 2, expireInSeconds: 180 });
      return 'queued';
    },
  };
}
