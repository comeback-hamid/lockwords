import { createRoute, OpenAPIHono, z } from '@hono/zod-openapi';
import type { Context } from 'hono';
import { imageUrl, publicOrigin } from './pictures.js';

import type { CardsStore, ReviewCard } from '../app.js';
import type { AuthUser } from '../auth.js';
import { AskSchema, type WordAsker } from '../llm/ask-word.js';
import type { UseItJudge } from '../llm/use-it.js';
import { UseItSchema } from '../llm/use-it.js';
import { reviewDay } from '../review/day.js';
import { applySwipe, canSwipe, canUseIt } from '../review/srs.js';
import { streakDays, todayNumbers } from '../review/summary.js';
import { UnauthorizedSchema } from './me.js';

const json = <T extends z.ZodType>(schema: T, description: string) => ({ description, content: { 'application/json': { schema } } });
const error = <T extends string>(code: T, name: string) => z.object({ error: z.literal(code) }).openapi(name);
const BadRequest = error('bad_request', 'BadRequest');
const NotFound = error('not_found', 'NotFound');
const CheckFailed = error('check_failed', 'CheckFailed');
const NotDue = error('not_due', 'NotDue');
const NothingToUndo = error('nothing_to_undo', 'NothingToUndo');
const unauthorized = { 401: json(UnauthorizedSchema, 'No valid login token') };
const security = [{ bearer: [] }];
const idParam = z.object({ id: z.string() });
const isUuid = (id: string) => z.uuid().safeParse(id).success;

export const ReviewCardSchema = z
  .object({ id: z.string(), deckId: z.string(), deckTopic: z.string(), word: z.string(), translation: z.string(), example: z.string(), exampleTranslation: z.string(), stage: z.number().int(), canUseIt: z.boolean(), meaning: z.string().optional(), imageUrl: z.string().nullable().optional() }) // imageUrl: the card's picture (a WebP address); left out when the card has none
  .openapi('ReviewCard');
const SwipeResultSchema = z
  .object({ id: z.string(), stage: z.number().int(), known: z.boolean(), hard: z.boolean(), backInDays: z.number().int().nullable(), again: z.boolean() })
  .openapi('SwipeResult');
const UseItResultSchema = z
  .object({ good: z.boolean(), lines: z.array(z.string()), followUp: z.string().nullable(), movedUp: z.boolean(), stage: z.number().int() })
  .openapi('UseItResult');
const AskFailed = error('ask_failed', 'AskFailed');

const getReview = createRoute({ method: 'get', path: '/review', security, request: { query: z.object({ deckId: z.string().optional() }) }, responses: { 200: json(z.object({ cards: z.array(ReviewCardSchema) }).openapi('Round'), "Today's cards"), ...unauthorized } });
const getHardWords = createRoute({
  method: 'get',
  path: '/hard-words',
  security,
  responses: { 200: json(z.object({ words: z.array(z.object({ word: z.string(), translation: z.string() })) }).openapi('HardWords'), 'Words that go to the lock screen'), ...unauthorized },
});
const postSwipe = createRoute({
  method: 'post',
  path: '/cards/{id}/swipe',
  security,
  request: { params: idParam, body: { required: true, content: { 'application/json': { schema: z.object({ direction: z.enum(['easy', 'hard', 'known']) }) } } } },
  responses: {
    200: json(SwipeResultSchema, 'The card after the swipe'),
    400: json(BadRequest, 'The request is not valid'),
    404: json(NotFound, 'No such card'),
    409: json(NotDue, "The card is not in today's round; nothing changed"),
    ...unauthorized,
  },
});
const postUndo = createRoute({
  method: 'post',
  path: '/review/undo',
  security,
  responses: { 200: json(z.object({ card: ReviewCardSchema }).openapi('Undone'), 'The card as it was before the swipe'), 409: json(NothingToUndo, 'No swipe to take back'), ...unauthorized },
});
const SummarySchema = z
  .object({
    day: z.string(), // today's review day, so the app can remember "streak card shown today"
    name: z.string().nullable(),
    streakDays: z.number().int(),
    today: z.object({ words: z.number().int(), minutes: z.number().int(), easy: z.number().int(), hard: z.number().int(), known: z.number().int(), stages: z.array(z.number().int()) }),
  })
  .openapi('ReviewSummary');
const getSummary = createRoute({ method: 'get', path: '/review/summary', security, responses: { 200: json(SummarySchema, 'The streak and what was done today'), ...unauthorized } });
// The Easy label on a card says "BACK IN N DAYS" while the finger still moves, before the swipe is saved.
// The app reads the numbers here; it never works them out itself.
const RulesSchema = z.object({ easyBackInDays: z.array(z.number().int()) }).openapi('ReviewRules'); // by the card's stage now: 0 (new) … 5
const getRules = createRoute({ method: 'get', path: '/review/rules', security, responses: { 200: json(RulesSchema, 'Days until an Easy card comes back, by stage'), ...unauthorized } });
const postUseIt = createRoute({
  method: 'post',
  path: '/cards/{id}/use-it',
  security,
  request: { params: idParam, body: { required: true, content: { 'application/json': { schema: z.object({ sentence: z.string().trim().min(1).max(300) }) } } } },
  responses: {
    200: json(UseItResultSchema, "Kai's feedback"),
    400: json(BadRequest, 'The request is not valid'),
    404: json(NotFound, 'No such card'),
    502: json(CheckFailed, 'The AI call failed; nothing changed'),
    ...unauthorized,
  },
});

const NotKnown = error('not_known', 'NotKnown');
const postRestore = createRoute({
  method: 'post',
  path: '/cards/{id}/restore',
  security,
  request: { params: idParam },
  responses: {
    200: json(z.object({ id: z.string(), stage: z.number().int(), known: z.literal(false) }).openapi('Restored'), 'The word is back in the word list'),
    404: json(NotFound, 'No such card'),
    409: json(NotKnown, 'The card is not marked "I know it"'),
    ...unauthorized,
  },
});
const postAsk = createRoute({
  method: 'post',
  path: '/cards/{id}/ask',
  security,
  request: {
    params: idParam,
    body: { required: true, content: { 'application/json': { schema: z.object({ question: z.string().trim().min(1).max(300), sentence: z.string().trim().max(300).optional() }) } } },
  },
  responses: {
    200: json(AskSchema.openapi('WordAnswer'), "Kai's answer about the word"),
    400: json(BadRequest, 'The request is not valid'),
    404: json(NotFound, 'No such card'),
    502: json(AskFailed, 'The AI call failed'),
    ...unauthorized,
  },
});

type Deps = { cards?: CardsStore; useItJudge?: UseItJudge; wordAsker?: WordAsker; reviewNow?: () => Date };

export function reviewRoutes(deps: Deps) {
  const need = <K extends keyof Deps>(key: K) => {
    const dep = deps[key];
    if (!dep) throw new Error(`${key} is not set`);
    return dep as NonNullable<Deps[K]>;
  };
  const app = new OpenAPIHono<{ Variables: { user: AuthUser } }>({
    defaultHook: (result, c) => (result.success ? undefined : c.json({ error: 'bad_request' as const }, 400)),
  });
  const clock = () => (deps.reviewNow ? deps.reviewNow() : new Date());
  const forApp = (card: ReviewCard, c: Context) => {
    // imageUrl is sent only for a card that has a picture (like `meaning`).
    const { imageUrl: path, ...rest } = card;
    return ReviewCardSchema.parse({ ...rest, canUseIt: canUseIt(), ...(path ? { imageUrl: imageUrl(publicOrigin(c), path) } : {}) });
  };
  return app
    .openapi(getReview, async (c) => {
      const now = clock();
      const today = reviewDay(now, c.req.header('X-Time-Zone'));
      const { deckId } = c.req.valid('query');
      if (deckId !== undefined && !isUuid(deckId)) return c.json({ cards: [] }, 200); // not a deck id: no such deck, an empty round
      const round = await need('cards').round(c.get('user').id, now, today, deckId);
      // Only what the app needs: due dates and flags stay on the server.
      return c.json({ cards: round.map((r) => forApp(r, c)) }, 200);
    })
    .openapi(getHardWords, async (c) => c.json({ words: await need('cards').hardWords(c.get('user').id) }, 200))
    .openapi(postSwipe, async (c) => {
      const userId = c.get('user').id;
      const { id } = c.req.valid('param');
      const { direction } = c.req.valid('json');
      const store = need('cards');
      const card = isUuid(id) ? await store.get(userId, id) : null;
      if (!card) return c.json({ error: 'not_found' as const }, 404);
      const now = clock();
      const { day, end } = reviewDay(now, c.req.header('X-Time-Zone'));
      const { backInDays, ...next } = applySwipe(card, direction, now);
      // A store with no history (some tests) cannot tell what happened today: it saves the swipe as it comes.
      if (!store.today || !store.saveSwipe) {
        await store.save(id, next);
        return c.json({ id, stage: next.stage, known: next.known, hard: next.hard, backInDays, again: false }, 200);
      }
      const today = await store.today(userId, id, day);
      if (!canSwipe(card, today, end)) return c.json({ error: 'not_due' as const }, 409);
      const before = { stage: card.stage, known: card.known, hard: card.hard, dueAt: card.dueAt };
      await store.saveSwipe(userId, id, { kind: direction, day, at: now, before, after: next });
      return c.json({ id, stage: next.stage, known: next.known, hard: next.hard, backInDays, again: false }, 200); // `again` stays in the answer for older app builds: a card never comes back the same day now
    })
    .openapi(postUndo, async (c) => {
      const store = need('cards');
      const { day } = reviewDay(clock(), c.req.header('X-Time-Zone'));
      const card = store.undoLast ? await store.undoLast(c.get('user').id, day) : null;
      return card ? c.json({ card: forApp(card, c) }, 200) : c.json({ error: 'nothing_to_undo' as const }, 409);
    })
    .openapi(getSummary, async (c) => {
      const store = need('cards');
      const { day } = reviewDay(clock(), c.req.header('X-Time-Zone'));
      const h = store.history ? await store.history(c.get('user').id, day) : { name: null, days: [], events: [] };
      return c.json({ day, name: h.name, streakDays: streakDays(h.days, day), today: todayNumbers(h.events) }, 200);
    })
    .openapi(getRules, (c) => {
      const now = clock();
      const easyBackInDays = [0, 1, 2, 3, 4, 5].map((stage) => applySwipe({ stage, known: false, hard: false, dueAt: null }, 'easy', now).backInDays ?? 0);
      return c.json({ easyBackInDays }, 200);
    })
    .openapi(postUseIt, async (c) => {
      const userId = c.get('user').id;
      const { id } = c.req.valid('param');
      const store = need('cards');
      const card = isUuid(id) ? await store.get(userId, id) : null;
      if (!card) return c.json({ error: 'not_found' as const }, 404);
      try {
        const languages = await store.languages(userId);
        const result = UseItSchema.parse(await need('useItJudge').check({ word: card.word, translation: card.translation, sentence: c.req.valid('json').sentence, ...languages }));
        const answer = { good: result.good, lines: result.lines, followUp: result.good ? (result.followUp ?? null) : null };
        if (!result.good) return c.json({ ...answer, movedUp: false, stage: card.stage }, 200);
        // A good sentence counts like an Easy swipe.
        const now = clock();
        const next = applySwipe(card, 'easy', now);
        const after = { stage: next.stage, known: next.known, hard: next.hard, dueAt: next.dueAt };
        // A store with no history (some tests): the old rule, a level for every good sentence under the top stage.
        if (!store.today || !store.saveSwipe) {
          const movedUp = card.stage < 5;
          if (movedUp) await store.save(id, after);
          return c.json({ ...answer, movedUp, stage: movedUp ? next.stage : card.stage }, 200);
        }
        // Once per card per day, only for a card of today's round, and only when Use it is offered for it.
        const { day, end } = reviewDay(now, c.req.header('X-Time-Zone'));
        const today = await store.today(userId, id, day);
        const movedUp = card.stage < 5 && !today.usedItToday && canSwipe(card, today, end);
        if (movedUp) await store.saveSwipe(userId, id, { kind: 'use_it', day, at: now, before: { stage: card.stage, known: card.known, hard: card.hard, dueAt: card.dueAt }, after });
        return c.json({ ...answer, movedUp, stage: movedUp ? next.stage : card.stage }, 200);
      } catch {
        return c.json({ error: 'check_failed' as const }, 502);
      }
    })
    .openapi(postRestore, async (c) => {
      const { id } = c.req.valid('param');
      const store = need('cards');
      const result = isUuid(id) && store.restore ? await store.restore(c.get('user').id, id, clock()) : 'not_found';
      if (result === 'not_found') return c.json({ error: 'not_found' as const }, 404);
      if (result === 'not_known') return c.json({ error: 'not_known' as const }, 409);
      return c.json({ ...result, known: false as const }, 200);
    })
    .openapi(postAsk, async (c) => {
      const userId = c.get('user').id;
      const { id } = c.req.valid('param');
      const store = need('cards');
      const card = isUuid(id) ? await store.get(userId, id) : null;
      if (!card) return c.json({ error: 'not_found' as const }, 404);
      try {
        const { question, sentence } = c.req.valid('json');
        const languages = await store.languages(userId);
        return c.json(AskSchema.parse(await need('wordAsker').ask({ word: card.word, translation: card.translation, question, sentence: sentence || undefined, ...languages })), 200);
      } catch {
        return c.json({ error: 'ask_failed' as const }, 502);
      }
    });
}
