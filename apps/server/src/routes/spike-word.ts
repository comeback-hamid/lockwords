import { Hono } from 'hono';

// shortcut: spike only, a fixed word. Real lock words come from SRS (hard words first) in `lock-widgets`.
export const spikeWord = new Hono().get('/', (c) =>
  c.json({ word: 'la mariposa', meaning: 'the butterfly', stage: 2, servedAt: new Date().toISOString() }),
);
