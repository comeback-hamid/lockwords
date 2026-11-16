import { createRoute, OpenAPIHono, z } from '@hono/zod-openapi';

import type { CardsStore } from '../app.js';
import type { AuthUser } from '../auth.js';
import type { UseItJudge } from '../llm/use-it.js';
import { UseItSchema } from '../llm/use-it.js';
import { applySwipe } from '../review/srs.js';
import { UnauthorizedSchema } from './me.js';

const json = <T extends z.ZodType>(schema: T, description: string) => ({ description, content: { 'application/json': { schema } } });
const error = <T extends string>(code: T, name: string) => z.object({ error: z.literal(code) }).openapi(name);
const BadRequest = error('bad_request', 'BadRequest');
const NotFound = error('not_found', 'NotFound');
const CheckFailed = error('check_failed', 'CheckFailed');
const unauthorized = { 401: json(UnauthorizedSchema, 'No valid login token') };
const security = [{ bearer: [] }];
const idParam = z.object({ id: z.string() });
const isUuid = (id: string) => z.uuid().safeParse(id).success;

export const ReviewCardSchema = z
  .object({ id: z.string(), deckId: z.string(), deckTopic: z.string(), word: z.string(), translation: z.string(), example: z.string(), exampleTranslation: z.string(), stage: z.number().int() })
  .openapi('ReviewCard');
const SwipeResultSchema = z.object({ id: z.string(), stage: z.number().int(), known: z.boolean(), hard: z.boolean(), backInDays: z.number().int().nullable() }).openapi('SwipeResult');
const UseItResultSchema = UseItSchema.extend({ movedUp: z.boolean(), stage: z.number().int() }).openapi('UseItResult');

const getReview = createRoute({ method: 'get', path: '/review', security, responses: { 200: json(z.object({ cards: z.array(ReviewCardSchema) }).openapi('Round'), "Today's cards"), ...unauthorized } });
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
  responses: { 200: json(SwipeResultSchema, 'The card after the swipe'), 400: json(BadRequest, 'The request is not valid'), 404: json(NotFound, 'No such card'), ...unauthorized },
});
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

type Deps = { cards?: CardsStore; useItJudge?: UseItJudge };

export function reviewRoutes(deps: Deps) {
  const need = <K extends keyof Deps>(key: K) => {
    const dep = deps[key];
    if (!dep) throw new Error(`${key} is not set`);
    return dep as NonNullable<Deps[K]>;
  };
  const app = new OpenAPIHono<{ Variables: { user: AuthUser } }>({
    defaultHook: (result, c) => (result.success ? undefined : c.json({ error: 'bad_request' as const }, 400)),
  });
  return app
    .openapi(getReview, async (c) => {
      const round = await need('cards').round(c.get('user').id, new Date());
      // Only what the app needs: due dates and flags stay on the server.
      return c.json({ cards: round.map((r) => ReviewCardSchema.parse(r)) }, 200);
    })
    .openapi(getHardWords, async (c) => c.json({ words: await need('cards').hardWords(c.get('user').id) }, 200))
    .openapi(postSwipe, async (c) => {
      const { id } = c.req.valid('param');
      const card = isUuid(id) ? await need('cards').get(c.get('user').id, id) : null;
      if (!card) return c.json({ error: 'not_found' as const }, 404);
      const { backInDays, ...next } = applySwipe(card, c.req.valid('json').direction, new Date());
      await need('cards').save(id, next);
      return c.json({ id, stage: next.stage, known: next.known, hard: next.hard, backInDays }, 200);
    })
    .openapi(postUseIt, async (c) => {
      const userId = c.get('user').id;
      const { id } = c.req.valid('param');
      const card = isUuid(id) ? await need('cards').get(userId, id) : null;
      if (!card) return c.json({ error: 'not_found' as const }, 404);
      try {
        const languages = await need('cards').languages(userId);
        const result = UseItSchema.parse(await need('useItJudge').check({ word: card.word, translation: card.translation, sentence: c.req.valid('json').sentence, ...languages }));
        const movedUp = result.good && card.stage < 5;
        let stage = card.stage;
        if (movedUp) {
          // A good sentence counts like an Easy swipe.
          const next = applySwipe(card, 'easy', new Date());
          stage = next.stage;
          await need('cards').save(id, { stage: next.stage, known: next.known, hard: next.hard, dueAt: next.dueAt });
        }
        return c.json({ ...result, movedUp, stage }, 200);
      } catch {
        return c.json({ error: 'check_failed' as const }, 502);
      }
    });
}
