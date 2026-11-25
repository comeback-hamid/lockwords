import { createRoute, OpenAPIHono, z } from '@hono/zod-openapi';

import type { KaiScriptStore, ProfilesStore } from '../app.js';
import type { AuthUser } from '../auth.js';
import { checkReply, KAI_STEPS, KaiLinesSchema, type KaiReplier } from '../llm/kai-reply.js';
import { ENGLISH_SCRIPT, goodScript, isEnglish } from '../kai/script.js';
import type { ScriptTranslator } from '../llm/translate-script.js';
import { UnauthorizedSchema } from './me.js';

const json = <T extends z.ZodType>(schema: T, description: string) => ({ description, content: { 'application/json': { schema } } });
const KaiReplyRequest = z.object({ step: z.enum(KAI_STEPS), text: z.string().min(1).max(200), options: z.array(z.string().min(1).max(80)).max(6).optional(), chat: z.enum(['native', 'target']).optional() }).openapi('KaiReplyRequest');
const KaiReplyResult = z
  .union([z.object({ onScript: z.literal(true), answer: z.string() }), z.object({ onScript: z.literal(false), lines: KaiLinesSchema, translations: z.array(z.string()).optional() })])
  .openapi('KaiReply');
const BadRequest = z.object({ error: z.literal('bad_request') }).openapi('BadRequest');
const KaiUnavailable = z.object({ error: z.literal('kai_unavailable') }).openapi('KaiUnavailable');

const postReply = createRoute({
  method: 'post',
  path: '/kai/reply',
  security: [{ bearer: [] }],
  request: { body: { content: { 'application/json': { schema: KaiReplyRequest } }, required: true } },
  responses: {
    200: json(KaiReplyResult, 'The text answers the step (answer), or Kai answers it (lines; with `chat: target` also one translation per line)'),
    400: json(BadRequest, 'Unknown step, or text empty or too long'),
    401: json(UnauthorizedSchema, 'No valid login token'),
    502: json(KaiUnavailable, 'The AI call failed; the app takes the text as the answer'),
  },
});

const language = z.string().trim().min(1).max(40);
const ScriptSchema = z.record(z.string(), z.string());
const getScript = createRoute({
  method: 'get',
  path: '/kai/script',
  security: [{ bearer: [] }],
  request: { query: z.object({ native: language, learning: language }) },
  responses: {
    200: json(z.object({ native: ScriptSchema, learning: ScriptSchema }).openapi('KaiScript'), "Kai's onboarding lines in the learner's language and in the learned language"),
    400: json(BadRequest, 'A language is missing or too long'),
    401: json(UnauthorizedSchema, 'No valid login token'),
  },
});

const USE_IT_KEYS = ['useItIntro', 'useItWrite', 'useItChecking', 'useItThinking', 'useItCheckFailed', 'useItAskFailed', 'replyExample', 'replySkip', 'replyNext'] as const;
const UseItScript = z
  .object({ nativeLanguage: z.string().nullable(), lines: z.record(z.string(), z.object({ text: z.string(), translation: z.string().optional() })) })
  .openapi('UseItScript');
const getUseItScript = createRoute({
  method: 'get',
  path: '/kai/use-it-script',
  security: [{ bearer: [] }],
  responses: {
    200: json(UseItScript, "Kai's fixed lines of the Use it chat, in the language Kai speaks with this learner; with a translation in their own language when that is the learned language"),
    401: json(UnauthorizedSchema, 'No valid login token'),
  },
});

// The learner's two languages and the language Kai speaks in their chats, from the profile.
export type ChatLanguages = (userId: string) => Promise<{ learningLanguage: string; nativeLanguage: string; chatLanguage?: string | null }>;
type Deps = { profiles?: ProfilesStore; kaiReplier?: KaiReplier; kaiScripts?: KaiScriptStore; scriptTranslator?: ScriptTranslator; chatLanguages?: ChatLanguages };

// Kai reads what a learner typed in a Kai chat (O10–O10f). Nothing is saved.
export function kaiRoutes(deps: Deps) {
  const app = new OpenAPIHono<{ Variables: { user: AuthUser } }>({
    defaultHook: (result, c) => (result.success ? undefined : c.json({ error: 'bad_request' as const }, 400)),
  });
  // The script in one language: English is built in; another language is read from the kept copy, or translated
  // once and kept. Anything that goes wrong gives the English script (and keeps nothing).
  async function scriptIn(name: string): Promise<Record<string, string>> {
    if (isEnglish(name) || !deps.kaiScripts || !deps.scriptTranslator) return ENGLISH_SCRIPT;
    const key = name.trim().toLowerCase();
    try {
      const kept = await deps.kaiScripts.get(key);
      if (kept && goodScript(kept)) return kept;
      const lines = await deps.scriptTranslator.translate(name.trim(), ENGLISH_SCRIPT);
      if (!goodScript(lines)) return ENGLISH_SCRIPT;
      const clean = Object.fromEntries(Object.keys(ENGLISH_SCRIPT).map((k) => [k, lines[k]!.trim()])); // only our keys
      await deps.kaiScripts.save(key, clean);
      return clean;
    } catch {
      return ENGLISH_SCRIPT;
    }
  }

  return app
    .openapi(getScript, async (c) => {
      const { native, learning } = c.req.valid('query');
      const [n, l] = await Promise.all([scriptIn(native), scriptIn(learning)]);
      return c.json({ native: n, learning: l }, 200);
    })
    // The Use it chat's fixed lines, ready to show: the same rule as every Kai chat (the learned language with the
    // learner's own language under it, or only their own language).
    .openapi(getUseItScript, async (c) => {
      const p = deps.chatLanguages ? await deps.chatLanguages(c.get('user').id).catch(() => null) : null;
      const target = p?.chatLanguage === 'target';
      const [own, learned] = await Promise.all([p?.nativeLanguage ? scriptIn(p.nativeLanguage) : ENGLISH_SCRIPT, target && p?.learningLanguage ? scriptIn(p.learningLanguage) : null]);
      const lines = Object.fromEntries(
        USE_IT_KEYS.map((key) => {
          const text = (learned ?? own)[key] ?? ENGLISH_SCRIPT[key]!;
          const under = learned ? own[key] : undefined;
          return [key, under && under !== text ? { text, translation: under } : { text }];
        }),
      );
      return c.json({ nativeLanguage: p?.nativeLanguage || null, lines }, 200);
    })
    .openapi(postReply, async (c) => {
    const { step, text, options = [], chat = 'native' } = c.req.valid('json');
    try {
      if (!deps.kaiReplier) throw new Error('kaiReplier is not set');
      const profile = ((await deps.profiles?.get(c.get('user').id)) ?? null) as ({ learningLanguage: string; nativeLanguage: string; name?: string | null } | null);
      const reply = await deps.kaiReplier.reply({ step, text, options, learningLanguage: profile?.learningLanguage ?? '', nativeLanguage: profile?.nativeLanguage ?? '', name: profile?.name ?? null, chat });
      return c.json(checkReply(step, reply), 200);
    } catch {
      return c.json({ error: 'kai_unavailable' as const }, 502);
    }
  });
}
