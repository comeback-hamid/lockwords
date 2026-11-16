import { createRoute, OpenAPIHono, z } from '@hono/zod-openapi';

import type { DecksStore, ProfilesStore } from '../app.js';
import type { AuthUser } from '../auth.js';
import { ideasFor } from '../decks/ideas.js';
import { CardSchema, CardsSchema, type DeckMaker } from '../llm/make-deck.js';
import { UnauthorizedSchema } from './me.js';

const json = <T extends z.ZodType>(schema: T, description: string) => ({ description, content: { 'application/json': { schema } } });
const error = <T extends string>(code: T, name: string) => z.object({ error: z.literal(code) }).openapi(name);
const BadRequest = error('bad_request', 'BadRequest');
const NoProfile = error('no_profile', 'NoProfile');
const NotFound = error('not_found', 'NotFound');
const GenerationFailed = error('generation_failed', 'GenerationFailed');
const unauthorized = { 401: json(UnauthorizedSchema, 'No valid login token') };
const security = [{ bearer: [] }];

export const DeckSchema = z
  .object({
    id: z.string(),
    topic: z.string(),
    title: z.string(),
    reason: z.string(),
    cefr: z.string(),
    wordCount: z.number().int(),
    status: z.enum(['proposed', 'ready']),
    cards: z.array(CardSchema.extend({ id: z.string(), position: z.number().int(), stage: z.number().int() }).openapi('Card')),
  })
  .openapi('Deck');
export type Deck = z.infer<typeof DeckSchema>;

const ChatSchema = z.object({ name: z.string().trim().min(1).max(40), chatLanguage: z.enum(['native', 'target']) }).openapi('ProfileChat');
// Not z.uuid(): a malformed id is simply "not found" (see the spec, "Decks are private").
const idParam = z.object({ id: z.string() });
const isUuid = (id: string) => z.uuid().safeParse(id).success;

const getIdeas = createRoute({ method: 'get', path: '/deck-ideas', security, responses: { 200: json(z.object({ ideas: z.array(z.string()) }).openapi('DeckIdeas'), 'Four first-deck topics'), ...unauthorized } });
const putChat = createRoute({
  method: 'put',
  path: '/profile/chat',
  security,
  request: { body: { required: true, content: { 'application/json': { schema: ChatSchema } } } },
  responses: { 200: json(ChatSchema, 'Saved'), 400: json(BadRequest, 'The request is not valid'), 409: json(NoProfile, 'Save the profile first'), ...unauthorized },
});
const postDeck = createRoute({
  method: 'post',
  path: '/decks',
  security,
  request: { body: { required: true, content: { 'application/json': { schema: z.object({ topic: z.string().trim().min(1).max(80) }) } } } },
  responses: { 201: json(DeckSchema, 'A proposed deck with no cards yet'), 400: json(BadRequest, 'The request is not valid'), 409: json(NoProfile, 'Save the profile first'), ...unauthorized },
});
const postGenerate = createRoute({
  method: 'post',
  path: '/decks/{id}/generate',
  security,
  request: { params: idParam },
  responses: { 200: json(DeckSchema, 'The ready deck with its cards'), 404: json(NotFound, 'No such deck'), 502: json(GenerationFailed, 'The AI call failed; nothing was saved'), ...unauthorized },
});
const getDeck = createRoute({
  method: 'get',
  path: '/decks/{id}',
  security,
  request: { params: idParam },
  responses: { 200: json(DeckSchema, 'The deck with its cards'), 404: json(NotFound, 'No such deck'), ...unauthorized },
});

type Deps = { profiles?: ProfilesStore; decks?: DecksStore; deckMaker?: DeckMaker };

export function deckRoutes(deps: Deps) {
  // Stores are optional in AppDeps so tests of other routes can leave them out.
  const need = <K extends keyof Deps>(key: K) => {
    const dep = deps[key];
    if (!dep) throw new Error(`${key} is not set`);
    return dep as NonNullable<Deps[K]>;
  };
  const app = new OpenAPIHono<{ Variables: { user: AuthUser } }>({
    defaultHook: (result, c) => (result.success ? undefined : c.json({ error: 'bad_request' as const }, 400)),
  });
  return app
    .openapi(getIdeas, async (c) => {
      const profile = await need('profiles').get(c.get('user').id);
      return c.json({ ideas: ideasFor(profile?.goal ?? 'travel') }, 200);
    })
    .openapi(putChat, async (c) => {
      const { name, chatLanguage } = c.req.valid('json');
      const saved = await need('profiles').setChat(c.get('user').id, name, chatLanguage);
      return saved ? c.json({ name, chatLanguage }, 200) : c.json({ error: 'no_profile' as const }, 409);
    })
    .openapi(postDeck, async (c) => {
      const userId = c.get('user').id;
      const { topic } = c.req.valid('json');
      const profile = await need('profiles').get(userId);
      if (!profile) return c.json({ error: 'no_profile' as const }, 409);
      const cefr = profile.cefr ?? 'A1';
      const proposal = await need('deckMaker').propose({ topic, learningLanguage: profile.learningLanguage, nativeLanguage: profile.nativeLanguage, cefr });
      return c.json(await need('decks').create(userId, { topic, cefr, ...proposal }), 201);
    })
    .openapi(postGenerate, async (c) => {
      const userId = c.get('user').id;
      const { id } = c.req.valid('param');
      const deck = isUuid(id) ? await need('decks').get(userId, id) : null;
      if (!deck) return c.json({ error: 'not_found' as const }, 404);
      if (deck.status === 'ready') return c.json(deck, 200);
      const profile = await need('profiles').get(userId);
      try {
        const made = await need('deckMaker').cards({ topic: deck.topic, learningLanguage: profile?.learningLanguage ?? '', nativeLanguage: profile?.nativeLanguage ?? '', cefr: deck.cefr });
        const { cards } = CardsSchema.parse({ cards: made }); // never trust the model's shape
        return c.json(await need('decks').saveCards(id, cards), 200);
      } catch {
        return c.json({ error: 'generation_failed' as const }, 502);
      }
    })
    .openapi(getDeck, async (c) => {
      const { id } = c.req.valid('param');
      const deck = isUuid(id) ? await need('decks').get(c.get('user').id, id) : null;
      return deck ? c.json(deck, 200) : c.json({ error: 'not_found' as const }, 404);
    });
}
