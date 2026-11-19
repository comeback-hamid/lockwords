import { createClient } from '@supabase/supabase-js';

import { backend } from '@/config/backend';

import { SECURE_KEYS, sessionStorage } from './session-storage';

// Supabase does login only. Our data goes through our own server (src/api/client.ts).
export const supabase = createClient(
  backend.supabaseUrl,
  backend.supabaseKey,
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
