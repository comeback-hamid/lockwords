import { createRoute, OpenAPIHono, z } from '@hono/zod-openapi';

import type { AuthUser } from '../auth.js';
import { AUDIO_FORMATS, type Transcriber } from '../llm/transcribe.js';
import { UnauthorizedSchema } from './me.js';

const json = <T extends z.ZodType>(schema: T, description: string) => ({ description, content: { 'application/json': { schema } } });
const BadRequestSchema = z.object({ error: z.literal('bad_request') }).openapi('BadRequest');
const TranscribeFailedSchema = z.object({ error: z.literal('transcribe_failed') }).openapi('TranscribeFailed');

// About 2 minutes of the app's recording (64 kbit/s) as base64. More than the app ever sends.
const MAX_AUDIO_CHARS = 1_500_000;

const postTranscribe = createRoute({
  method: 'post',
  path: '/transcribe',
  security: [{ bearer: [] }],
  request: { body: { required: true, content: { 'application/json': { schema: z.object({ audio: z.string().min(1).max(MAX_AUDIO_CHARS), format: z.enum(AUDIO_FORMATS) }).openapi('TranscribeRequest') } } } },
  responses: {
    200: json(z.object({ text: z.string() }).openapi('Transcript'), 'What the learner said, as text. Empty when nothing was heard.'),
    400: json(BadRequestSchema, 'The request is not valid'),
    401: json(UnauthorizedSchema, 'No valid login token'),
    502: json(TranscribeFailedSchema, 'The AI call failed'),
  },
});

// The mic in the chat box: a short recording (base64) becomes text for the box. Nothing is saved.
export function transcribeRoutes(transcriber: Transcriber | undefined) {
  const app = new OpenAPIHono<{ Variables: { user: AuthUser } }>({
    defaultHook: (result, c) => (result.success ? undefined : c.json({ error: 'bad_request' as const }, 400)),
  });
  return app.openapi(postTranscribe, async (c) => {
    if (!transcriber) throw new Error('transcriber is not set');
    const { audio, format } = c.req.valid('json');
    const bytes = Buffer.from(audio, 'base64');
    if (bytes.length === 0) return c.json({ error: 'bad_request' as const }, 400);
    try {
      return c.json({ text: await transcriber.transcribe(bytes, format) }, 200);
    } catch {
      return c.json({ error: 'transcribe_failed' as const }, 502);
    }
  });
}
