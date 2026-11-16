import { createClient } from '@supabase/supabase-js';

import { SECURE_KEYS, sessionStorage } from './session-storage';

// Supabase does login only. Our data goes through our own server (src/api/client.ts).
export const supabase = createClient(
  process.env.EXPO_PUBLIC_SUPABASE_URL ?? 'http://127.0.0.1:54321',
  process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ?? 'missing-anon-key',
  {
    auth: {
      storage: sessionStorage,
      storageKey: SECURE_KEYS[0],
      autoRefreshToken: true,
      persistSession: true,
      detectSessionInUrl: false,
    },
  },
);
