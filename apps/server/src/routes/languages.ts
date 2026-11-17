import { createRoute, OpenAPIHono, z } from '@hono/zod-openapi';

import type { AuthUser } from '../auth.js';
import { LanguageCheckSchema, type LanguageChecker } from '../llm/check-language.js';
import { listedLanguage } from '../onboarding/languages.js';
import { UnauthorizedSchema } from './me.js';

const json = <T extends z.ZodType>(schema: T, description: string) => ({ description, content: { 'application/json': { schema } } });
const BadRequestSchema = z.object({ error: z.literal('bad_request') }).openapi('BadRequest');
const CheckFailedSchema = z.object({ error: z.literal('check_failed') }).openapi('CheckFailed');

const LanguageSchema = z.object({ code: z.string(), name: z.string(), listed: z.boolean() }).openapi('Language');
const LanguageCheckResultSchema = z
  .object({ result: z.enum(['match', 'suggestion', 'unknown']), language: LanguageSchema.nullable() })
  .openapi('LanguageCheckResult');
type Result = z.infer<typeof LanguageCheckResultSchema>;

const postCheck = createRoute({
  method: 'post',
  path: '/languages/check',
  security: [{ bearer: [] }],
  request: { body: { required: true, content: { 'application/json': { schema: z.object({ name: z.string().trim().min(1).max(40) }) } } } },
  responses: {
    200: json(LanguageCheckResultSchema, 'match, suggestion (did you mean) or unknown'),
    400: json(BadRequestSchema, 'The request is not valid'),
    401: json(UnauthorizedSchema, 'No valid login token'),
    502: json(CheckFailedSchema, 'The AI call failed'),
  },
});

const same = (a: string, b: string) => a.trim().toLowerCase() === b.trim().toLowerCase();

// The rule: listed names need no AI; the AI's answer becomes match (same spelling), suggestion or unknown.
async function judge(text: string, checker: LanguageChecker): Promise<Result | null> {
  const listed = listedLanguage(text);
  if (listed) return { result: 'match', language: { ...listed, listed: true } };
  let answer;
  try {
    answer = LanguageCheckSchema.parse(await checker.check(text));
  } catch {
    return null;
  }
  if (!answer.isLanguage) return { result: 'unknown', language: null };
  if (!answer.name || !answer.code) return null;
  const known = listedLanguage(answer.code) ?? listedLanguage(answer.name);
  const language = known ? { ...known, listed: true } : { code: answer.code.toLowerCase(), name: answer.name, listed: false };
  return { result: same(language.name, text) ? 'match' : 'suggestion', language };
}

export function languageRoutes(checker: LanguageChecker | undefined) {
  const app = new OpenAPIHono<{ Variables: { user: AuthUser } }>({
    defaultHook: (result, c) => (result.success ? undefined : c.json({ error: 'bad_request' as const }, 400)),
  });
  return app.openapi(postCheck, async (c) => {
    if (!checker) throw new Error('language checker is not set');
    const result = await judge(c.req.valid('json').name, checker);
    return result ? c.json(result, 200) : c.json({ error: 'check_failed' as const }, 502);
  });
}
