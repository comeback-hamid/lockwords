import { createRoute, OpenAPIHono, z } from '@hono/zod-openapi';

import type { UsersStore } from '../app.js';
import type { AuthUser } from '../auth.js';
import type { WordPackMaker } from '../llm/word-pack.js';
import { EST_U, EST_VERSION, packVocab, type Vocab } from '../onboarding/estimate.js';
import type { WordTestStore } from '../onboarding/word-test-store.js';
import { nextPage, packKey, publicPages, scoreTest, vocabFor } from '../onboarding/word-test.js';
import { UnauthorizedSchema } from './me.js';

// Word test (O4–O7) following docs/vocab-engine.md. The app gets words only; the server keeps ranks and made-up flags,
// decides the next page, and scores.
const json = <T extends z.ZodType>(schema: T, description: string) => ({ description, content: { 'application/json': { schema } } });
const BadRequestSchema = z.object({ error: z.literal('bad_request') }).openapi('BadRequest');
const errors = { 400: json(BadRequestSchema, 'The request is not valid'), 401: json(UnauthorizedSchema, 'No valid login token') };
const security = [{ bearer: [] }];
const language = z.string().trim().min(1).max(40);

const WordSchema = z.object({ w: z.string(), rd: z.string().optional() }).openapi('TestWord');
const PagesSchema = z
  .object({ A: z.array(WordSchema), B: z.array(WordSchema), C: z.array(WordSchema), D: z.array(WordSchema) })
  .partial()
  .openapi('TestPages');
// madeUp: the pages hold made-up words (the 13 word files do; an AI pack for a typed language does not).
const WordTestSchema = z.object({ supported: z.boolean(), madeUp: z.boolean(), pages: PagesSchema }).openapi('WordTest');
const words = z.array(z.string().max(60)).max(30);
const KnownSchema = z.object({ A: words, B: words, C: words.optional(), D: words.optional() }).openapi('TestAnswers');
const NextSchema = z.object({ next: z.enum(['C', 'D']).nullable() }).openapi('NextPage');
const EstimateSchema = z
  .object({
    words: z.number().int(),
    outOf: z.number().int(),
    plus: z.boolean(),
    cefr: z.enum(['A1', 'A2', 'B1', 'B2', 'C1', 'C2']),
    startingFresh: z.boolean(),
    reliable: z.boolean(),
    fakesTicked: z.number().int(),
  })
  .openapi('Estimate');
const body = z.object({ language, known: KnownSchema });

const getWordTest = createRoute({
  method: 'get',
  path: '/word-test',
  security,
  request: { query: z.object({ language }) },
  responses: { 200: json(WordTestSchema, 'The test pages (words only, order fixed per user), or supported: false'), ...errors },
});
const postNext = createRoute({
  method: 'post',
  path: '/word-test/next',
  security,
  request: { body: { required: true, content: { 'application/json': { schema: body } } } },
  responses: { 200: json(NextSchema, 'The next page, or null when the test is over'), ...errors },
});
const postEstimate = createRoute({
  method: 'post',
  path: '/word-test/estimate',
  security,
  request: { body: { required: true, content: { 'application/json': { schema: body } } } },
  responses: { 200: json(EstimateSchema, 'About how many of the 5,000 most common words the user recognises'), ...errors },
});

type Deps = { users?: UsersStore; wordTests?: WordTestStore; wordPackMaker?: WordPackMaker };

export function wordTestRoutes(deps: Deps) {
  // A listed language's word file, or the stored AI pack of a typed language (made now if it does not exist yet).
  async function vocabOf(language: string, makeIfMissing: boolean): Promise<Vocab | null> {
    const file = vocabFor(language);
    if (file) return file;
    const key = packKey(language);
    let pack = (await deps.wordTests?.getPack(key)) ?? null;
    if (!pack && makeIfMissing && deps.wordPackMaker && deps.wordTests) {
      const made = await deps.wordPackMaker.make(language.trim());
      if (made) {
        await deps.wordTests.savePack(key, made);
        pack = await deps.wordTests.getPack(key);
      }
    }
    return pack ? packVocab(pack) : null;
  }

  const app = new OpenAPIHono<{ Variables: { user: AuthUser } }>({
    defaultHook: (result, c) => (result.success ? undefined : c.json({ error: 'bad_request' as const }, 400)),
  });
  return app
    .openapi(getWordTest, async (c) => {
      const lang = c.req.valid('query').language;
      const vocab = await vocabOf(lang, true);
      return c.json(vocab ? { supported: true, madeUp: vocabFor(lang) !== null, pages: publicPages(vocab, c.get('user').id) } : { supported: false, madeUp: false, pages: {} }, 200);
    })
    .openapi(postNext, async (c) => {
      const { language: lang, known } = c.req.valid('json');
      const vocab = await vocabOf(lang, false);
      if (!vocab) return c.json({ error: 'bad_request' as const }, 400);
      return c.json({ next: nextPage(vocab, known) }, 200);
    })
    .openapi(postEstimate, async (c) => {
      const { language: lang, known } = c.req.valid('json');
      const vocab = await vocabOf(lang, false);
      if (!vocab) return c.json({ error: 'bad_request' as const }, 400);
      const r = scoreTest(vocab, known);
      if (deps.wordTests && deps.users) {
        const { id, isGuest } = c.get('user');
        await deps.users.upsert(id, isGuest); // the result row points to the user row
        await deps.wordTests.saveResult({
          userId: id,
          language: vocabFor(lang) ? lang.trim().toLowerCase() : packKey(lang),
          version: EST_VERSION,
          words: r.words,
          raw: r.raw,
          lo: r.lo,
          hi: r.hi,
          r50: r.r50,
          g: r.g,
          realKnown: r.realKnown,
          fakes: r.fakes,
          fn: r.fn,
          pages: r.pages.join(''),
          reliable: r.reliable,
          ticks: r.ticks,
        });
      }
      return c.json(
        { words: r.words, outOf: EST_U, plus: r.plus, cefr: r.cefr as z.infer<typeof EstimateSchema>['cefr'], startingFresh: r.startingFresh, reliable: r.reliable, fakesTicked: r.fakesTicked },
        200,
      );
    });
}
