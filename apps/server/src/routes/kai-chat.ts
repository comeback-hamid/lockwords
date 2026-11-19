import { createRoute, OpenAPIHono, z } from '@hono/zod-openapi';

import type { ProfilesStore } from '../app.js';
import type { AuthUser } from '../auth.js';
import type { RandomWordsStore } from '../decks/random-words.js';
import { kaiTurn, readChat, type KaiMessage, type KaiStore } from '../kai/chat.js';
import type { KaiChat } from '../llm/kai-chat.js';
import { UnauthorizedSchema } from './me.js';

// The New words chat with Kai: read it, take a turn (or let Kai open), and the translation switch.

const json = <T extends z.ZodType>(schema: T, description: string) => ({ description, content: { 'application/json': { schema } } });
const error = <T extends string>(code: T, name: string) => z.object({ error: z.literal(code) }).openapi(name);
const BadRequest = error('bad_request', 'KaiBadRequest');
const NoProfile = error('no_profile', 'KaiNoProfile');
const TooMany = error('too_many_messages', 'KaiTooManyMessages');
const Unavailable = error('kai_unavailable', 'KaiUnavailable');
const unauthorized = { 401: json(UnauthorizedSchema, 'No valid login token') };
const security = [{ bearer: [] }];

// A word card on a Kai message: the word, the Random Words deck that takes it now (or took it), and what happened to it.
const WordSchema = z
  .object({ word: z.string(), translation: z.string(), example: z.string(), exampleTranslation: z.string(), addTo: z.string(), added: z.boolean(), already: z.boolean() })
  .openapi('KaiWord');
const MessageSchema = z
  .object({ id: z.string(), from: z.enum(['kai', 'user']), text: z.string(), translation: z.string().nullable(), createdAt: z.string(), word: WordSchema.optional() })
  .openapi('KaiMessage');
const NotFound = error('not_found', 'KaiNotFound');
const NoWord = error('no_word', 'KaiNoWord');
const AddedWordSchema = z.object({ deckId: z.string(), deckTitle: z.string(), count: z.number().int(), already: z.boolean() }).openapi('KaiAddedWord');
const ChatSchema = z
  .object({ messages: z.array(MessageSchema), options: z.array(z.string()), translationOn: z.boolean(), nativeLanguage: z.string().nullable() })
  .openapi('KaiChat');
// userMessage is a union, not `.nullable()`: on a named schema that makes a type the app cannot use.
const TurnSchema = z
  .object({ userMessage: z.union([MessageSchema, z.null()]), messages: z.array(MessageSchema), options: z.array(z.string()), action: z.enum(['review']).nullable() })
  .openapi('KaiTurn');
// Exactly one of: the learner's text, or `open` for Kai's opening.
const TurnBody = z
  .object({ text: z.string().trim().min(1).max(500).optional(), open: z.literal(true).optional() })
  .refine((b) => (b.text === undefined) !== (b.open === undefined), 'send text or open, not both')
  .openapi('KaiTurnRequest');

const getChat = createRoute({ method: 'get', path: '/kai/chat', security, responses: { 200: json(ChatSchema, 'The newest messages, oldest first'), ...unauthorized } });
const postTurn = createRoute({
  method: 'post',
  path: '/kai/chat/turns',
  security,
  request: { body: { required: true, content: { 'application/json': { schema: TurnBody } } } },
  responses: {
    200: json(TurnSchema, "Kai's new lines"),
    400: json(BadRequest, 'The request is not valid'),
    409: json(NoProfile, 'The user has no profile yet'),
    429: json(TooMany, 'More than 200 messages in 24 hours'),
    502: json(Unavailable, 'The AI call failed; nothing was saved'),
    ...unauthorized,
  },
});
const putTranslation = createRoute({
  method: 'put',
  path: '/kai/chat/translation',
  security,
  request: { body: { required: true, content: { 'application/json': { schema: z.object({ on: z.boolean() }) } } } },
  responses: {
    200: json(z.object({ translationOn: z.boolean() }).openapi('KaiTranslation'), 'The saved choice'),
    400: json(BadRequest, 'The request is not valid'),
    409: json(NoProfile, 'The user has no profile yet'),
    ...unauthorized,
  },
});
const postAddWord = createRoute({
  method: 'post',
  path: '/kai/chat/messages/{id}/add-word',
  security,
  request: { params: z.object({ id: z.string() }) },
  responses: {
    200: json(AddedWordSchema, 'The deck that has the word now. Safe to repeat. `already` = the learner had this word, nothing was added'),
    404: json(NotFound, 'No such message'),
    409: json(NoWord, 'The message has no word card'),
    ...unauthorized,
  },
});

const toMessage = (m: KaiMessage) => ({ id: m.id, from: m.from, text: m.text, translation: m.translation, createdAt: m.createdAt.toISOString(), ...(m.word ? { word: m.word } : {}) });

type Deps = { kai?: KaiStore; profiles?: ProfilesStore; kaiChat?: KaiChat; kaiNow?: () => Date; randomWords?: RandomWordsStore };

export function kaiChatRoutes(deps: Deps) {
  const need = <K extends keyof Deps>(key: K) => {
    const dep = deps[key];
    if (!dep) throw new Error(`${key} is not set`);
    return dep as NonNullable<Deps[K]>;
  };
  const all = () => ({ kai: need('kai'), profiles: need('profiles'), kaiChat: need('kaiChat') });
  const now = () => (deps.kaiNow ? deps.kaiNow() : new Date());
  const app = new OpenAPIHono<{ Variables: { user: AuthUser } }>({
    defaultHook: (result, c) => (result.success ? undefined : c.json({ error: 'bad_request' as const }, 400)),
  });
  return app
    .openapi(getChat, async (c) => {
      const chat = await readChat(all(), c.get('user').id, now());
      return c.json({ ...chat, messages: chat.messages.map(toMessage) }, 200);
    })
    .openapi(postTurn, async (c) => {
      const body = c.req.valid('json');
      const result = await kaiTurn(all(), c.get('user').id, body.text ?? null, now());
      if (!result.ok) {
        if (result.error === 'no_profile') return c.json({ error: result.error }, 409);
        if (result.error === 'too_many_messages') return c.json({ error: result.error }, 429);
        return c.json({ error: result.error }, 502);
      }
      return c.json({ userMessage: result.userMessage ? toMessage(result.userMessage) : null, messages: result.messages.map(toMessage), options: result.options, action: result.action }, 200);
    })
    .openapi(putTranslation, async (c) => {
      const { on } = c.req.valid('json');
      if (!(await need('kai').setTranslation(c.get('user').id, on))) return c.json({ error: 'no_profile' as const }, 409);
      return c.json({ translationOn: on }, 200);
    })
    .openapi(postAddWord, async (c) => {
      const { id } = c.req.valid('param');
      // A malformed id is simply "not found".
      const added = z.uuid().safeParse(id).success ? await need('randomWords').add(c.get('user').id, id) : { ok: false as const, error: 'not_found' as const };
      if (added.ok) return c.json(added.result, 200);
      return added.error === 'no_word' ? c.json({ error: added.error }, 409) : c.json({ error: added.error }, 404);
    });
}
