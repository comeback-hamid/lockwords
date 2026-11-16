type SessionResult = { data: { session: { access_token: string } | null }; error: unknown };
export type GuestAuth = { getSession(): Promise<SessionResult>; signInAnonymously(): Promise<SessionResult> };

// Returns the login token, or null when sign-in is not possible right now. Never throws: the app opens anyway.
export async function ensureGuest(auth: GuestAuth): Promise<string | null> {
  try {
    const saved = await auth.getSession();
    if (saved.data.session) return saved.data.session.access_token;
    const fresh = await auth.signInAnonymously();
    return fresh.error ? null : (fresh.data.session?.access_token ?? null);
  } catch {
    return null;
  }
}
