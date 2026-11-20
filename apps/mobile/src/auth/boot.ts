import { createApi } from '@/api/client';
import { backend } from '@/config/backend';

import { ensureGuest } from './guest';
import { setMe } from './me-store';
import { clearOnFreshInstall } from './session-storage';
import { startSession } from './start-session';
import { supabase } from './supabase';

export const api = createApi({
  baseUrl: backend.apiUrl,
  getToken: async () => (await supabase.auth.getSession()).data.session?.access_token ?? null,
});

// Called once from the root layout. Never blocks the screen and never throws.
export async function bootSession() {
  setMe(await startSession({ clearOnFreshInstall, ensureGuest: () => ensureGuest(supabase.auth), fetchMe: api.fetchMe }));
}
