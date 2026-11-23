import { z } from 'zod';

// AI task: Kai reads what a learner typed in a Kai chat. Either it answers the current step (onScript),
// or Kai gives 1–2 short lines back and the app asks the question again.
export const KAI_STEPS = ['name', 'language', 'topic', 'proposed', 'generating', 'drawing', 'ready'] as const;
export type KaiStep = (typeof KAI_STEPS)[number];
// chat: the language Kai speaks in this chat now. "native" (also when left out) = the learner's own language; "target" = the
// language they learn, and then every line comes with its translation into their own language.
export type KaiReplyInput = { step: KaiStep; text: string; options: string[]; learningLanguage: string; nativeLanguage: string; name: string | null; chat?: 'native' | 'target' };

export const KaiLinesSchema = z.array(z.string().min(1).max(160)).min(1).max(2);
export const MAX_TRANSLATION_CHARS = 300;
// Translations are extra: one per line, plain text (shown small under the line). A list that does not fit is dropped, never the lines.
const Translations = z
  .unknown()
  .optional()
  .transform((t) => (Array.isArray(t) ? t.map((x) => (typeof x === 'string' ? x.replaceAll('**', '').trim().slice(0, MAX_TRANSLATION_CHARS) : '')) : []));
export const KaiReplySchema = z.union([
  z.object({ onScript: z.literal(true), answer: z.string().min(1).max(80) }),
  z.object({ onScript: z.literal(false), lines: KaiLinesSchema, translations: Translations }),
]);
export type KaiReply = { onScript: true; answer: string } | { onScript: false; lines: string[]; translations?: string[] };
export type KaiReplier = { reply(input: KaiReplyInput): Promise<KaiReply> };

// What counts as an answer for each step. proposed and generating take no typed answer.
const ANSWER: Record<KaiStep, z.ZodType<string> | null> = {
  name: z.string().min(1).max(40),
  language: z.enum(['native', 'target']),
  topic: z.string().min(1).max(80),
  ready: z.enum(['practice', 'wordsFirst']),
  proposed: null,
  generating: null,
  drawing: null, // the words are made and the pictures are being drawn: the learner chats with Kai while they wait
};

// Checks a reply against the step. Throws when it does not fit (the route answers 502).
export function checkReply(step: KaiStep, reply: unknown): KaiReply {
  const r = KaiReplySchema.parse(reply);
  if (r.onScript) {
    const rule = ANSWER[step];
    if (!rule) throw new Error(`no typed answer in step ${step}`);
    return { onScript: true, answer: rule.parse(r.answer.trim()) };
  }
  const fits = r.translations.length === r.lines.length && r.translations.every((t) => t !== '');
  return { onScript: false, lines: r.lines, ...(fits ? { translations: r.translations } : {}) };
}
