import { z } from 'zod';

// AI task: the learner asks Kai a question about one word (after a Use it sentence). Kai answers in 1 to 3 short lines.
// It never changes the card.
export type AskInput = { word: string; translation: string; question: string; sentence?: string; learningLanguage: string; nativeLanguage: string; chat?: 'native' | 'target' };
// translations: with chat 'target', the same lines in the learner's own language, one per line.
export const AskSchema = z.object({ lines: z.array(z.string().min(1).max(200)).min(1).max(3), translations: z.array(z.string()).nullish() });
export type AskResult = z.infer<typeof AskSchema>;
export type WordAsker = { ask(input: AskInput): Promise<AskResult> };
