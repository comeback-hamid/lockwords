// Where the app's server and its login service live.
// Default: the cloud. That is what a build with no settings uses, so a release build can never point at a developer's Mac.
// Local stack (development, Maestro): set EXPO_PUBLIC_API_URL, EXPO_PUBLIC_SUPABASE_URL and EXPO_PUBLIC_SUPABASE_ANON_KEY
// (`npm run dev:up` writes them to apps/mobile/.env.local).

export const CLOUD = {
  apiUrl: 'https://lockwords-rhaic.ondigitalocean.app',
  supabaseUrl: 'https://sskhsgygvdpnnokvuuyd.supabase.co',
  // The publishable key is public by design: it ships inside every copy of the app. It only lets a phone start a login.
  supabaseKey: 'sb_publishable_vSq8d0XASaKOZDFTWfURIg_vPvUm8Bj', // gitleaks:allow (the publishable key is public, not a secret)
} as const;

export type Backend = { apiUrl: string; supabaseUrl: string; supabaseKey: string; name: 'cloud' | 'custom' };
type Env = { apiUrl?: string; supabaseUrl?: string; supabaseKey?: string };

// All three values belong together (a login from one place is not accepted by a server of another).
// So: all three set = use them; none set = the cloud; only some set = a mistake, said loudly.
export function pickBackend(env: Env): Backend {
  const given = [env.apiUrl, env.supabaseUrl, env.supabaseKey].filter((v) => v !== undefined && v !== '');
  if (given.length === 0) return { ...CLOUD, name: 'cloud' };
  if (given.length < 3) throw new Error('Set all three of EXPO_PUBLIC_API_URL, EXPO_PUBLIC_SUPABASE_URL and EXPO_PUBLIC_SUPABASE_ANON_KEY, or none of them (none = the cloud).');
  return { apiUrl: env.apiUrl!, supabaseUrl: env.supabaseUrl!, supabaseKey: env.supabaseKey!, name: 'custom' };
}

// Expo puts EXPO_PUBLIC_* values into the app only when they are written out in full like this.
export const backend = pickBackend({
  apiUrl: process.env.EXPO_PUBLIC_API_URL,
  supabaseUrl: process.env.EXPO_PUBLIC_SUPABASE_URL,
  supabaseKey: process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY,
});
