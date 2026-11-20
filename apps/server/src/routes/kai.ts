import { createRoute, OpenAPIHono, z } from '@hono/zod-openapi';

import type { KaiScriptStore, ProfilesStore } from '../app.js';
import type { AuthUser } from '../auth.js';
import { checkReply, KAI_STEPS, KaiLinesSchema, type KaiReplier } from '../llm/kai-reply.js';
import { ENGLISH_SCRIPT, goodScript, isEnglish } from '../kai/script.js';
import type { ScriptTranslator } from '../llm/translate-script.js';
import { UnauthorizedSchema } from './me.js';

const json = <T extends z.ZodType>(schema: T, description: string) => ({ description, content: { 'application/json': { schema } } });
const KaiReplyRequest = z.object({ step: z.enum(KAI_STEPS), text: z.string().min(1).max(200), options: z.array(z.string().min(1).max(80)).max(6).optional() }).openapi('KaiReplyRequest');
const KaiReplyResult = z
  .union([z.object({ onScript: z.literal(true), answer: z.string() }), z.object({ onScript: z.literal(false), lines: KaiLinesSchema })])
  .openapi('KaiReply');
const BadRequest = z.object({ error: z.literal('bad_request') }).openapi('BadRequest');
const KaiUnavailable = z.object({ error: z.literal('kai_unavailable') }).openapi('KaiUnavailable');

const postReply = createRoute({
  method: 'post',
  path: '/kai/reply',
  security: [{ bearer: [] }],
  request: { body: { content: { 'application/json': { schema: KaiReplyRequest } }, required: true } },
  responses: {
    200: json(KaiReplyResult, 'The text answers the step (answer), or Kai answers it (lines)'),
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

type Deps = { profiles?: ProfilesStore; kaiReplier?: KaiReplier; kaiScripts?: KaiScriptStore; scriptTranslator?: ScriptTranslator };

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
    .openapi(postReply, async (c) => {
    const { step, text, options = [] } = c.req.valid('json');
    try {
      if (!deps.kaiReplier) throw new Error('kaiReplier is not set');
      const profile = ((await deps.profiles?.get(c.get('user').id)) ?? null) as ({ learningLanguage: string; nativeLanguage: string; name?: string | null } | null);
      const reply = await deps.kaiReplier.reply({ step, text, options, learningLanguage: profile?.learningLanguage ?? '', nativeLanguage: profile?.nativeLanguage ?? '', name: profile?.name ?? null });
      return c.json(checkReply(step, reply), 200);
    } catch {
      return c.json({ error: 'kai_unavailable' as const }, 502);
    }
  });
}
