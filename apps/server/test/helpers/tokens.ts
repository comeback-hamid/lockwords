import { createLocalJWKSet, exportJWK, generateKeyPair, SignJWT, type JWTVerifyGetKey } from 'jose';

export const ISSUER = 'http://127.0.0.1:54321/auth/v1';

// Tests sign their own tokens with their own key pair. No Supabase needed.
export async function makeTestKeys() {
  const { publicKey, privateKey } = await generateKeyPair('ES256');
  const other = await generateKeyPair('ES256');
  const keys: JWTVerifyGetKey = createLocalJWKSet({ keys: [{ ...(await exportJWK(publicKey)), kid: 'test', alg: 'ES256' }] });

  type Opts = { sub?: string; isGuest?: boolean; issuer?: string; expiresIn?: string; wrongKey?: boolean };
  async function token(opts: Opts = {}) {
    return new SignJWT({ is_anonymous: opts.isGuest ?? true })
      .setProtectedHeader({ alg: 'ES256', kid: 'test' })
      .setSubject(opts.sub ?? crypto.randomUUID())
      .setIssuer(opts.issuer ?? ISSUER)
      .setAudience('authenticated')
      .setIssuedAt()
      .setExpirationTime(opts.expiresIn ?? '1h')
      .sign(opts.wrongKey ? other.privateKey : privateKey);
  }
  return { keys, token };
}
