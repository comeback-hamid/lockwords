import { z } from 'zod';

// All server settings come from here. Missing or bad values stop the server at start.
const schema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().default(8787),
  DATABASE_URL: z.string().url(),
  // Supabase does login only. Local: `supabase start`. Cloud: the project URL.
  SUPABASE_URL: z.string().url().default('http://127.0.0.1:54321'),
  // Optional: without it the server makes the fixture deck (see src/llm/fixture.ts).
  ANTHROPIC_API_KEY: z.string().min(1).optional(),
  SUPABASE_JWT_ISSUER: z.string().url().default('http://127.0.0.1:54321/auth/v1'),
  // The web app's addresses that may call this API from a browser, comma separated ("https://app.example.com"). Localhost is always allowed.
  WEB_ORIGINS: z
    .string()
    .default('')
    .transform((list) => list.split(',').map((o) => o.trim()).filter(Boolean)),
});

export type Env = z.infer<typeof schema>;

export function loadEnv(source: NodeJS.ProcessEnv = process.env): Env {
  const env = schema.parse(source);
  // Tests may only touch a database whose name contains "test".
  if (env.NODE_ENV === 'test' && !new URL(env.DATABASE_URL).pathname.includes('test')) {
    throw new Error('NODE_ENV=test needs a DATABASE_URL whose database name contains "test"');
  }
  return env;
}
