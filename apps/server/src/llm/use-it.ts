import { z } from 'zod';

// AI task: judge one sentence the learner wrote with a word, and answer as Kai in short lines (**bold** allowed).
// chat: the language Kai speaks in the learner's chats. 'target' = the language they learn, with each line also in
// their own language (`translations`, one per line) for the translation switch. 'native' = their own language only.
export type UseItInput = { word: string; translation: string; sentence: string; learningLanguage: string; nativeLanguage: string; chat?: 'native' | 'target' };
// followUp: one short question the learner might ask next about the word (for example "Why “le”?"), or nothing.
export const UseItSchema = z.object({ good: z.boolean(), lines: z.array(z.string().min(1).max(200)).min(1).max(4), followUp: z.string().min(1).max(60).nullish(), translations: z.array(z.string()).nullish() });
export type UseItResult = z.infer<typeof UseItSchema>;
export type UseItJudge = { check(input: UseItInput): Promise<UseItResult> };
