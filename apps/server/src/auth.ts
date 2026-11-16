import type { MiddlewareHandler } from 'hono';
import { jwtVerify, type JWTVerifyGetKey } from 'jose';

export type AuthSettings = { keys: JWTVerifyGetKey; issuer: string };
export type AuthUser = { id: string; isGuest: boolean };

// Checks the Supabase login token on every /v1 request. Never logs the token.
export function requireUser(auth: AuthSettings | undefined): MiddlewareHandler<{ Variables: { user: AuthUser } }> {
  return async (c, next) => {
    const token = c.req.header('Authorization')?.match(/^Bearer (.+)$/)?.[1];
    if (!auth || !token) return c.json({ error: 'unauthorized' }, 401);
    try {
      const { payload } = await jwtVerify(token, auth.keys, { issuer: auth.issuer, audience: 'authenticated' });
      if (!payload.sub) return c.json({ error: 'unauthorized' }, 401);
      c.set('user', { id: payload.sub, isGuest: payload.is_anonymous === true });
    } catch {
      return c.json({ error: 'unauthorized' }, 401);
    }
    await next();
  };
}
