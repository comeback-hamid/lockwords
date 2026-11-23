import { createRoute, OpenAPIHono, z } from '@hono/zod-openapi';
import type { Context } from 'hono';

import type { CardsStore, DecksStore, ProfilesStore } from '../app.js';
import type { AuthUser } from '../auth.js';
import { ideasFor } from '../decks/ideas.js';
import { inlineDeckJobs, type DeckJobs } from '../decks/jobs.js';
import { CardSchema, type DeckMaker } from '../llm/make-deck.js';
import { UnauthorizedSchema } from './me.js';
import { imageUrl, publicOrigin } from './pictures.js';

const json = <T extends z.ZodType>(schema: T, description: string) => ({ description, content: { 'application/json': { schema } } });
const error = <T extends string>(code: T, name: string) => z.object({ error: z.literal(code) }).openapi(name);
const BadRequest = error('bad_request', 'BadRequest');
const NoProfile = error('no_profile', 'NoProfile');
const NotFound = error('not_found', 'NotFound');
const GenerationFailed = error('generation_failed', 'GenerationFailed');
const DeckGenerating = error('deck_generating', 'DeckGenerating');
const unauthorized = { 401: json(UnauthorizedSchema, 'No valid login token') };
const security = [{ bearer: [] }];

export const DeckSchema = z
  .object({
    id: z.string(),
    topic: z.string(),
    title: z.string(),
    // The title in the user's native language; null for a deck with none (onboarding). Optional in the type so older callers still fit.
    titleTranslation: z.string().nullable().optional(),
    reason: z.string(),
    cefr: z.string(),
    kind: z.enum(['topic', 'random']).optional(), // always set by the server; "random" = a Random Words deck
    wordCount: z.number().int(),
    status: z.enum(['proposed', 'generating', 'ready']),
    // The deck's pictures, made right after its words: none (an older deck, or no image model), making, ready (every card has one),
    // failed (the run ended and some cards have none; the deck works without them). Always set by the server.
    picturesStatus: z.enum(['none', 'making', 'ready', 'failed']).optional(),
    picturesReady: z.number().int().optional(), // how many cards have their picture
    // imageUrl: the address of the card's picture (a WebP). Left out when the card has none (yet), like `meaning`.
    cards: z.array(CardSchema.omit({ pictureHint: true }).extend({ imageUrl: z.string().nullable().optional(), id: z.string(), position: z.number().int(), stage: z.number().int(), hard: z.boolean().optional(), known: z.boolean().optional() }).openapi('Card')),
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
  responses: { 200: json(DeckSchema, 'The ready deck with its cards; or still generating (read the deck again in a moment)'), 404: json(NotFound, 'No such deck'), 502: json(GenerationFailed, 'The AI call failed; nothing was saved'), ...unauthorized },
});
const getDeck = createRoute({
  method: 'get',
  path: '/decks/{id}',
  security,
  request: { params: idParam },
  responses: { 200: json(DeckSchema, 'The deck with its cards'), 404: json(NotFound, 'No such deck'), ...unauthorized },
});
// Removing: the learner takes a word or a whole deck out of their word list. A mark in the database, never a real delete.
const deleteDeck = createRoute({
  method: 'delete',
  path: '/decks/{id}',
  security,
  request: { params: idParam },
  responses: { 204: { description: 'The deck and its cards are removed' }, 404: json(NotFound, 'No such deck'), 409: json(DeckGenerating, 'The deck is being made; try again when it is ready'), ...unauthorized },
});
const deleteCard = createRoute({
  method: 'delete',
  path: '/cards/{id}',
  security,
  request: { params: idParam },
  responses: { 204: { description: 'The card is removed' }, 404: json(NotFound, 'No such card'), ...unauthorized },
});

type Deps = { profiles?: ProfilesStore; decks?: DecksStore; cards?: CardsStore; deckMaker?: DeckMaker; deckJobs?: DeckJobs; deckWaitMs?: number };

const POLL_MS = 300;
const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

// Every answer that returns a deck includes titleTranslation (null when the deck has none).
// So do the pictures' status and count. A card that has a picture gets imageUrl as a full address; a card with none has no imageUrl.
const out = (deck: Deck, c: Context) => {
  const origin = publicOrigin(c);
  return {
    ...deck,
    titleTranslation: deck.titleTranslation ?? null,
    picturesStatus: deck.picturesStatus ?? ('none' as const),
    picturesReady: deck.picturesReady ?? 0,
    cards: deck.cards.map(({ imageUrl: path, ...card }) => (path ? { ...card, imageUrl: imageUrl(origin, path) } : card)),
  };
};

export function deckRoutes(deps: Deps) {
  // Stores are optional in AppDeps so tests of other routes can leave them out.
  const need = <K extends keyof Deps>(key: K) => {
    const dep = deps[key];
    if (!dep) throw new Error(`${key} is not set`);
    return dep as NonNullable<Deps[K]>;
  };
  // `remove` is optional on the store types (older test fakes); the real stores always have it.
  const remover = <K extends 'decks' | 'cards'>(key: K) => {
    const store = need(key);
    if (!store.remove) throw new Error(`${key}.remove is not set`);
    return store.remove.bind(store) as NonNullable<NonNullable<Deps[K]>['remove']>;
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
      const proposal = await need('deckMaker').propose({ topic, learningLanguage: profile.learningLanguage, nativeLanguage: profile.nativeLanguage, cefr, level: profile.level, knownWords: profile.knownWords, goal: profile.goal, goalOther: profile.goalOther, interests: profile.interests });
      return c.json(out(await need('decks').create(userId, { topic, cefr, ...proposal }), c), 201);
    })
    .openapi(postGenerate, async (c) => {
      const userId = c.get('user').id;
      const { id } = c.req.valid('param');
      const deck = isUuid(id) ? await need('decks').get(userId, id) : null;
      if (!deck) return c.json({ error: 'not_found' as const }, 404);
      if (deck.status === 'ready') return c.json(out(deck, c), 200);
      const failed = () => c.json({ error: 'generation_failed' as const }, 502);
      if (deck.status === 'proposed') {
        const jobs = deps.deckJobs ?? inlineDeckJobs({ profiles: need('profiles'), decks: need('decks'), deckMaker: need('deckMaker') });
        const outcome = await jobs.start(userId, id).catch(() => 'failed' as const);
        if (outcome === 'failed') return failed();
      }
      // A worker is making the words. Wait a short while, so a fast job still answers in one call.
      const until = Date.now() + (deps.deckWaitMs ?? 20_000);
      for (;;) {
        const now = await need('decks').get(userId, id);
        if (!now || now.status === 'proposed') return failed(); // the job failed and saved nothing
        if (now.status === 'ready' || Date.now() >= until) return c.json(out(now, c), 200);
        await sleep(POLL_MS);
      }
    })
    .openapi(getDeck, async (c) => {
      const { id } = c.req.valid('param');
      const deck = isUuid(id) ? await need('decks').get(c.get('user').id, id) : null;
      return deck ? c.json(out(deck, c), 200) : c.json({ error: 'not_found' as const }, 404);
    })
    .openapi(deleteDeck, async (c) => {
      const { id } = c.req.valid('param');
      const result = isUuid(id) ? await remover('decks')(c.get('user').id, id) : 'not_found';
      if (result === 'removed') return c.body(null, 204);
      return result === 'generating' ? c.json({ error: 'deck_generating' as const }, 409) : c.json({ error: 'not_found' as const }, 404);
    })
    .openapi(deleteCard, async (c) => {
      const { id } = c.req.valid('param');
      const removed = isUuid(id) && (await remover('cards')(c.get('user').id, id));
      return removed ? c.body(null, 204) : c.json({ error: 'not_found' as const }, 404);
    });
}
