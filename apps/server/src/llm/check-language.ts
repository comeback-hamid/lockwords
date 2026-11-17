import { z } from 'zod';

// AI task: is this typed text a language? If so, its English name and ISO code.
export const LanguageCheckSchema = z.object({
  isLanguage: z.boolean(),
  name: z.string().min(1).max(60).nullable(),
  code: z.string().min(2).max(8).nullable(),
});
export type LanguageCheck = z.infer<typeof LanguageCheckSchema>;
export type LanguageChecker = { check(text: string): Promise<LanguageCheck> };

export const checkLanguagePrompt = (text: string) =>
  `A language learning app asked a user to type a language name. They typed: ${JSON.stringify(text)}\n` +
  `Is it a human language (a misspelling or the language's own name counts)? If yes, give its usual English name and its ISO 639-1 code (ISO 639-3 if it has no 639-1 code). If it is not a language, give null for both.\n` +
  `Answer with JSON only: {"isLanguage": boolean, "name": string | null, "code": string | null}`;

// Stands in for the model in tests and in local runs with no ANTHROPIC_API_KEY.
const KNOWN: Record<string, [string, string]> = {
  spansh: ['Spanish', 'es'], spanich: ['Spanish', 'es'], espanol: ['Spanish', 'es'], español: ['Spanish', 'es'],
  frensh: ['French', 'fr'], germn: ['German', 'de'], deutsch: ['German', 'de'], farsi: ['Persian', 'fa'],
  swedish: ['Swedish', 'sv'], dutch: ['Dutch', 'nl'], polish: ['Polish', 'pl'], greek: ['Greek', 'el'],
  hindi: ['Hindi', 'hi'], urdu: ['Urdu', 'ur'], bengali: ['Bengali', 'bn'], vietnamese: ['Vietnamese', 'vi'],
  thai: ['Thai', 'th'], indonesian: ['Indonesian', 'id'], malay: ['Malay', 'ms'], hebrew: ['Hebrew', 'he'],
  ukrainian: ['Ukrainian', 'uk'], czech: ['Czech', 'cs'], romanian: ['Romanian', 'ro'], hungarian: ['Hungarian', 'hu'],
  danish: ['Danish', 'da'], norwegian: ['Norwegian', 'no'], finnish: ['Finnish', 'fi'], swahili: ['Swahili', 'sw'],
  tagalog: ['Tagalog', 'tl'], kurdish: ['Kurdish', 'ku'], armenian: ['Armenian', 'hy'], georgian: ['Georgian', 'ka'],
};
export const fixtureLanguageChecker: LanguageChecker = {
  check: async (text) => {
    const hit = KNOWN[text.trim().toLowerCase()];
    return hit ? { isLanguage: true, name: hit[0], code: hit[1] } : { isLanguage: false, name: null, code: null };
  },
};
