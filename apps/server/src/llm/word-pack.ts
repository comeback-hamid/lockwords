import { z } from 'zod';

import type { WordPack } from '../onboarding/estimate.js';

// AI task: the word test for a typed language that has no word file (docs/vocab-engine.md section 1.3).
// 20 different real words in each of 3 bands of dictionary words: A = top 1,000, B = 1,000–2,500, C = 2,500–5,000.
// Null = not a real language, or the call failed. The caller then skips the test, so onboarding never blocks.
export type WordPackMaker = { make(language: string): Promise<WordPack | null> };

const twenty = z.array(z.string().trim().min(1).max(40)).length(20).refine((l) => new Set(l.map((w) => w.toLowerCase())).size === 20, 'words must be different');
export const WordPackSchema = z.object({ known: z.boolean(), A: twenty, B: twenty, C: twenty });

// Port of the funnel's "langpack" prompt (~/apps/lockwords-fn/netlify/functions/lw-ai.mjs), test part only.
export const wordPackPrompt = (language: string) =>
  `A learner typed this as a language: "${language}". It may be misspelled or written in another language; work out which language they mean. Use the standard written form of that language, in its usual script.\n` +
  `If it is not a real human language, answer {"known": false, "A": [], "B": [], "C": []}.\n` +
  `Otherwise make a yes/no "which words do you know" test: exactly 20 different real words in EACH of A, B and C (60 words in total). ` +
  `A = among the 1,000 most common dictionary words, B = about 1,000–2,500, C = about 2,500–5,000; in each list order the words from most to least common. ` +
  `Dictionary forms (verbs in the infinitive, nouns singular, with the article only if learners normally see one). No names, numbers, swear words or function words. No two words from the same family. Single words, no translations.\n` +
  `Answer with JSON only: {"known": true, "A": string[], "B": string[], "C": string[]}`;

const MODEL = 'claude-haiku-5-5'; // the pack is long; the funnel uses Haiku to stay fast
const TIMEOUT_MS = 30_000;

export function claudeWordPackMaker(apiKey: string, fetchFn: typeof fetch = fetch): WordPackMaker {
  return {
    async make(language) {
      try {
        const res = await fetchFn('https://api.anthropic.com/v1/messages', {
          method: 'POST',
          headers: { 'x-api-key': apiKey, 'anthropic-version': '2023-06-01', 'content-type': 'application/json' },
          body: JSON.stringify({ model: MODEL, max_tokens: 3000, messages: [{ role: 'user', content: wordPackPrompt(language) }] }),
          signal: AbortSignal.timeout(TIMEOUT_MS),
        });
        if (!res.ok) return null;
        const body = (await res.json()) as { content?: { type: string; text?: string }[] };
        const text = body.content?.find((c) => c.type === 'text')?.text ?? '';
        const out = WordPackSchema.safeParse(JSON.parse(text.slice(text.indexOf('{'), text.lastIndexOf('}') + 1)));
        return out.success && out.data.known ? { A: out.data.A, B: out.data.B, C: out.data.C } : null;
      } catch {
        return null;
      }
    },
  };
}

// No AI key (local runs): a typed language has no test, as before.
export const fixtureWordPackMaker: WordPackMaker = { make: async () => null };
