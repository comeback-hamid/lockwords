import { z } from 'zod';

// AI task: judge one sentence the learner wrote with a word, and answer as Kai in short lines (**bold** allowed).
export type UseItInput = { word: string; translation: string; sentence: string; learningLanguage: string; nativeLanguage: string };
// followUp: one short question the learner might ask next about the word (for example "Why “le”?"), or nothing.
export const UseItSchema = z.object({ good: z.boolean(), lines: z.array(z.string().min(1).max(200)).min(1).max(4), followUp: z.string().min(1).max(60).nullish() });
export type UseItResult = z.infer<typeof UseItSchema>;
export type UseItJudge = { check(input: UseItInput): Promise<UseItResult> };
