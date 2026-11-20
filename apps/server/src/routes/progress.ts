import { createRoute, OpenAPIHono, z } from '@hono/zod-openapi';

import type { ProgressStore } from '../app.js';
import type { AuthUser } from '../auth.js';
import { bankNumbers, deckSummary, goalFor, masterBy, paceFrom } from '../progress/numbers.js';
import { reviewDay } from '../review/day.js';
import { UnauthorizedSchema } from './me.js';

const json = <T extends z.ZodType>(schema: T, description: string) => ({ description, content: { 'application/json': { schema } } });
const unauthorized = { 401: json(UnauthorizedSchema, 'No valid login token') };
const security = [{ bearer: [] }];
const stages = z.array(z.number().int());

const ProgressSchema = z
  .object({ total: z.number().int(), new: z.number().int(), learning: z.number().int(), mastered: z.number().int(), decks: z.number().int(), goal: z.number().int(), masterBy: z.string(), grid: stages })
  .openapi('Progress');
const DeckSummarySchema = z
  .object({ id: z.string(), topic: z.string(), title: z.string(), kind: z.enum(['topic', 'random']), words: z.number().int(), learning: z.number().int(), hard: z.number().int(), stages })
  .openapi('DeckSummary');

const getProgress = createRoute({ method: 'get', path: '/progress', security, responses: { 200: json(ProgressSchema, 'The numbers of the Progress tab'), ...unauthorized } });
const getDecks = createRoute({ method: 'get', path: '/decks', security, responses: { 200: json(z.object({ decks: z.array(DeckSummarySchema) }).openapi('DeckList'), "The learner's decks, newest first"), ...unauthorized } });

const PACE_DAYS_MS = 6 * 86_400_000; // today and the 6 days before it

type Deps = { progress?: ProgressStore; reviewNow?: () => Date };

// The Progress tab (Figma P1–P2): numbers for the home page and the deck list.
export function progressRoutes(deps: Deps) {
  const store = () => {
    if (!deps.progress) throw new Error('progress is not set');
    return deps.progress;
  };
  const clock = () => (deps.reviewNow ? deps.reviewNow() : new Date());
  return new OpenAPIHono<{ Variables: { user: AuthUser } }>()
    .openapi(getProgress, async (c) => {
      const userId = c.get('user').id;
      const now = clock();
      const zone = c.req.header('X-Time-Zone');
      const [decks, startedLately] = await Promise.all([store().decks(userId), store().startedSince(userId, reviewDay(new Date(now.getTime() - PACE_DAYS_MS), zone).day)]);
      const { toLearn, started, ...numbers } = bankNumbers(decks.flatMap((d) => d.words));
      const goal = goalFor(toLearn);
      return c.json({ ...numbers, decks: decks.length, goal, masterBy: masterBy(reviewDay(now, zone).day, goal, started, paceFrom(startedLately)) }, 200);
    })
    .openapi(getDecks, async (c) => {
      const decks = await store().decks(c.get('user').id);
      return c.json({ decks: decks.map(({ words, ...deck }) => ({ ...deck, ...deckSummary(words) })) }, 200);
    });
}
