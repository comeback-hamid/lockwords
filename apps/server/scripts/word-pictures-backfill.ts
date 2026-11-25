import { PgBoss } from 'pg-boss';

import { createDb } from '../src/db/client.js';
import { missingWordPictures } from '../src/db/pictures.js';
import { sendWordPictureBackfill } from '../src/decks/word-pictures.js';

// Pictures for older single words: words in "Random Words N" decks that have no picture (kept before 2026-11-25, or
// whose picture failed). This script only counts, or hands jobs to the running server; the server draws them, one deck
// at a time, each deck's missing words on one sheet (one image call per deck).
//
//   DATABASE_URL=… npx tsx scripts/word-pictures-backfill.ts                  count only, changes nothing
//   DATABASE_URL=… npx tsx scripts/word-pictures-backfill.ts --run --limit 20 queue the 20 oldest decks
//
// Safe to run again: a card that has its picture is skipped, so a second run only does what is left.
// The cloud database: its CA file goes in NODE_EXTRA_CA_CERTS (see .do/with-db-ca.sh).
const url = process.env.DATABASE_URL;
if (!url) throw new Error('DATABASE_URL is not set');
const run = process.argv.includes('--run');
const limitArg = process.argv.indexOf('--limit');
const limit = limitArg > 0 ? Number(process.argv[limitArg + 1]) : 20;
if (!Number.isInteger(limit) || limit < 1) throw new Error('--limit must be a whole number above 0');

const { db, pool } = createDb(url);
const missing = await missingWordPictures(db);
const words = missing.reduce((n, d) => n + d.words, 0);
console.log(`${words} word${words === 1 ? '' : 's'} with no picture, in ${missing.length} Random Words deck${missing.length === 1 ? '' : 's'} (one image call per deck).`);
if (run && missing.length) {
  const batch = missing.slice(0, limit);
  // Only adds jobs: the tables are the server's, so nothing is made or cleaned from here.
  const boss = new PgBoss({ connectionString: url, migrate: false, supervise: false, schedule: false });
  boss.on('error', (e) => console.error('pg-boss', e.message));
  await boss.start();
  for (const deck of batch) await sendWordPictureBackfill(boss, deck.deckId);
  await boss.stop();
  console.log(`Queued ${batch.length} deck${batch.length === 1 ? '' : 's'} (${batch.reduce((n, d) => n + d.words, 0)} words). ${missing.length - batch.length} left for the next run. Run with no flags in a few minutes to see what is left.`);
} else if (!run) console.log('Counted only. Add --run to draw them (--limit N decks, 20 if left out).');
await pool.end();
