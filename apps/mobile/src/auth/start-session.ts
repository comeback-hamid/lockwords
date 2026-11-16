import type { Me } from '@/api/client';

type Steps = {
  clearOnFreshInstall(): Promise<void>;
  ensureGuest(): Promise<string | null>;
  fetchMe(): Promise<Me>;
};

// Runs once at app start. Null = no user yet (offline or server down); we try again on the next open.
export async function startSession(steps: Steps): Promise<Me | null> {
  try {
    await steps.clearOnFreshInstall();
    if (!(await steps.ensureGuest())) return null;
    return await steps.fetchMe();
  } catch {
    return null;
  }
}
