import { createRoute, OpenAPIHono, z } from '@hono/zod-openapi';

import type { ProfilesStore } from '../app.js';
import type { AuthUser } from '../auth.js';
import { ProfileSchema } from '../onboarding/profile.js';
import { estimate, wordTestFor } from '../onboarding/word-test.js';
import { UnauthorizedSchema } from './me.js';

const json = <T extends z.ZodType>(schema: T, description: string) => ({ description, content: { 'application/json': { schema } } });
const BadRequestSchema = z.object({ error: z.literal('bad_request') }).openapi('BadRequest');
const errors = { 400: json(BadRequestSchema, 'The request is not valid'), 401: json(UnauthorizedSchema, 'No valid login token') };
const security = [{ bearer: [] }];
const language = z.string().trim().min(1).max(40);

const WordTestSchema = z
  .object({
    supported: z.boolean(),
    bands: z.array(z.object({ level: z.enum(['basic', 'intermediate', 'advanced']), words: z.array(z.string()) })),
  })
  .openapi('WordTest');
const EstimateSchema = z.object({ knownWords: z.number().int(), outOf: z.number().int(), cefr: z.string() }).openapi('Estimate');

const getWordTest = createRoute({
  method: 'get',
  path: '/word-test',
  security,
  request: { query: z.object({ language }) },
  responses: { 200: json(WordTestSchema, 'Three word lists, or supported: false'), ...errors },
});
const postEstimate = createRoute({
  method: 'post',
  path: '/word-test/estimate',
  security,
  request: { body: { required: true, content: { 'application/json': { schema: z.object({ language, known: z.array(z.string()).max(200) }) } } } },
  responses: { 200: json(EstimateSchema, 'About how many common words the user knows'), ...errors },
});
const putProfile = createRoute({
  method: 'put',
  path: '/profile',
  security,
  request: { body: { required: true, content: { 'application/json': { schema: ProfileSchema } } } },
  responses: { 200: json(ProfileSchema, 'The saved profile'), ...errors },
});

export function onboardingRoutes(profiles: ProfilesStore | undefined) {
  const app = new OpenAPIHono<{ Variables: { user: AuthUser } }>({
    // Every bad query or body gets the same short answer.
    defaultHook: (result, c) => (result.success ? undefined : c.json({ error: 'bad_request' as const }, 400)),
  });
  return app
    .openapi(getWordTest, (c) => {
      const bands = wordTestFor(c.req.valid('query').language);
      return c.json(bands ? { supported: true, bands } : { supported: false, bands: [] }, 200);
    })
    .openapi(postEstimate, (c) => {
      const { language, known } = c.req.valid('json');
      const bands = wordTestFor(language);
      if (!bands) return c.json({ error: 'bad_request' as const }, 400);
      return c.json(estimate(bands, known), 200);
    })
    .openapi(putProfile, async (c) => {
      if (!profiles) throw new Error('profiles store is not set');
      return c.json(await profiles.upsert(c.get('user').id, c.req.valid('json')), 200);
    });
}
