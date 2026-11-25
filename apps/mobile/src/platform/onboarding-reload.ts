// A browser reload in the middle of onboarding. The answers live in memory (src/onboarding/store.ts), so a reload
// loses them while the address still names a later screen. The phone's rule applies: a restart starts onboarding
// again. `hasLanguage` = the first answer (the language to learn) is there.
const NEED_NOTHING = ['/onboarding/hello', '/onboarding/learning'];

export function lostAnswers(pathname: string, hasLanguage: boolean): boolean {
  if (!pathname.startsWith('/onboarding/')) return false;
  return !hasLanguage && !NEED_NOTHING.includes(pathname);
}

// Where that restart goes. A learner who already finished onboarding (an old onboarding address, reloaded) gets the app.
export const restartRoute = (finished: boolean | null) => (finished ? '/' : '/onboarding/hello');
