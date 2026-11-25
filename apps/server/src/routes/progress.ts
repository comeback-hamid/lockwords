import { createRoute, OpenAPIHono, z } from '@hono/zod-openapi';

import type { PlanStore, ProfilesStore, ProgressStore } from '../app.js';
import type { AuthUser } from '../auth.js';
import { languageName } from '../llm/make-deck.js';
import { goalWords, openItems, PLAN_SIZE, PlanItemSchema, PlanSchema, type DeckPlanner } from '../llm/plan-decks.js';
import { bankNumbers, deckSummary, futureStops, goalFor, hardCount, levelFor, masterBy, paceFrom, treeLevels } from '../progress/numbers.js';
import { reviewDay } from '../review/day.js';
import { UnauthorizedSchema } from './me.js';

const json = <T extends z.ZodType>(schema: T, description: string) => ({ description, content: { 'application/json': { schema } } });
const unauthorized = { 401: json(UnauthorizedSchema, 'No valid login token') };
const security = [{ bearer: [] }];
const stages = z.array(z.number().int());

const ProgressSchema = z
  .object({
    total: z.number().int(),
    new: z.number().int(),
    learning: z.number().int(),
    mastered: z.number().int(),
    hard: z.number().int(), // hard words that are not marked "I know it": the length of the full hard words list
    decks: z.number().int(),
    goal: z.number().int(),
    masterBy: z.string(),
    grid: stages,
    language: z.string(),
    trees: z.array(stages),
    deckWords: z.array(z.number().int()), // how many words each tree's deck has, in the order of `trees`
    // The future bar: the vocabulary and level now (left out with no word test), and each stop of the bar.
    vocabulary: z.number().int().optional(),
    level: z.string().optional(),
    stops: z.array(z.object({ words: z.number().int(), by: z.string(), vocabulary: z.number().int().optional(), level: z.string().optional() })),
  })
  .openapi('Progress');
const DeckSummarySchema = z
  .object({ id: z.string(), topic: z.string(), title: z.string(), cefr: z.string(), kind: z.enum(['topic', 'random']), words: z.number().int(), learning: z.number().int(), hard: z.number().int(), stages })
  .openapi('DeckSummary');

const getProgress = createRoute({ method: 'get', path: '/progress', security, responses: { 200: json(ProgressSchema, 'The numbers of the Progress tab'), ...unauthorized } });
const getDecks = createRoute({ method: 'get', path: '/decks', security, responses: { 200: json(z.object({ decks: z.array(DeckSummarySchema) }).openapi('DeckList'), "The learner's decks, newest first"), ...unauthorized } });

const PACE_DAYS_MS = 6 * 86_400_000; // today and the 6 days before it
const PLAN_FRESH_MS = 7 * 86_400_000; // a plan older than this is made again

const getPlan = createRoute({
  method: 'get',
  path: '/plan',
  security,
  responses: { 200: json(z.object({ goal: z.string(), items: z.array(PlanItemSchema) }).openapi('WordPlan'), "The learner's next deck ideas (empty when there is no plan)"), ...unauthorized },
});

type Deps = { progress?: ProgressStore; profiles?: ProfilesStore; plans?: PlanStore; deckPlanner?: DeckPlanner; reviewNow?: () => Date };

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
      const [decks, startedLately, language, profile] = await Promise.all([store().decks(userId), store().startedSince(userId, reviewDay(new Date(now.getTime() - PACE_DAYS_MS), zone).day), store().learningLanguage(userId), deps.profiles?.get(userId)]);
      const words = decks.flatMap((d) => d.words);
      const { toLearn, started, ...numbers } = bankNumbers(words);
      const goal = goalFor(toLearn);
      // The meadow: one tree per deck, oldest first (the store lists newest first).
      const oldestFirst = [...decks].reverse();
      const trees = oldestFirst.map((d) => treeLevels(d.words));
      const deckWords = oldestFirst.map((d) => d.words.length);
      const today = reviewDay(now, zone).day;
      const pace = paceFrom(startedLately);
      const knownAtStart = profile?.knownWords ?? null;
      // The vocabulary now: what the word test found plus the words mastered here.
      const vocabulary = knownAtStart === null ? null : knownAtStart + numbers.mastered;
      return c.json(
        { ...numbers, hard: hardCount(words), decks: decks.length, goal, masterBy: masterBy(today, goal, started, pace), language: language ? languageName(language) : '', trees, deckWords, ...(vocabulary === null ? {} : { vocabulary, level: levelFor(vocabulary) }), stops: futureStops(today, started, pace, knownAtStart) },
        200,
      );
    })
    .openapi(getPlan, async (c) => {
      const userId = c.get('user').id;
      const profile = await deps.profiles?.get(userId);
      if (!profile || !deps.plans || !deps.deckPlanner) return c.json({ goal: '', items: [] }, 200);
      const now = clock();
      const have = (await store().decks(userId)).map((d) => d.topic);
      const kept = await deps.plans.get(userId);
      const left = kept ? openItems(kept.items, have) : [];
      const fresh = kept !== null && now.getTime() - kept.createdAt.getTime() < PLAN_FRESH_MS;
      if (left.length >= PLAN_SIZE && fresh) return c.json({ goal: goalWords(profile), items: left.slice(0, PLAN_SIZE) }, 200);
      try {
        // A new plan: the AI may repeat a topic or offer more than three; only the open ones are kept.
        const made = PlanSchema.parse(await deps.deckPlanner.plan({ ...profile, have }));
        const items = openItems(made.items, have).slice(0, PLAN_SIZE);
        if (items.length === 0) throw new Error('no new idea');
        await deps.plans.save(userId, items, now);
        return c.json({ goal: goalWords(profile), items }, 200);
      } catch {
        // The AI failed: what is left of the old plan is still good.
        return c.json({ goal: goalWords(profile), items: left.slice(0, PLAN_SIZE) }, 200);
      }
    })
    .openapi(getDecks, async (c) => {
      const decks = await store().decks(c.get('user').id);
      return c.json({ decks: decks.map(({ words, ...deck }) => ({ ...deck, ...deckSummary(words) })) }, 200);
    });
}
