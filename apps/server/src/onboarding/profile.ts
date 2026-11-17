import { z } from '@hono/zod-openapi';

export const LEVELS = ['brand_new', 'beginner', 'some_basics', 'intermediate', 'advanced'] as const;
export const GOALS = ['travel', 'work', 'move_abroad', 'family_friends', 'brain', 'school', 'other'] as const;
export const INTERESTS = [
  'food', 'travel', 'work', 'business', 'tech', 'science', 'music', 'movies', 'books', 'sports',
  'health', 'nature', 'animals', 'art', 'news', 'family', 'friends_dating', 'shopping', 'money', 'culture',
] as const;
export const MAX_INTERESTS = 5;
type Interest = (typeof INTERESTS)[number];

// Interests dropped on 2026-11-17 that map to one still on the list. Other dropped ones (fashion, gaming) are left out.
const OLD_INTERESTS: Record<string, Interest> = { cooking: 'food', fitness: 'health' };
const isInterest = (s: string): s is Interest => (INTERESTS as readonly string[]).includes(s);

// A saved row can hold old names. Read them clean: map, leave out the rest, keep each once. The row is not changed.
export function readInterests(saved: readonly string[]): Interest[] {
  const out: Interest[] = [];
  for (const s of saved) {
    const i = isInterest(s) ? s : OLD_INTERESTS[s];
    if (i && !out.includes(i)) out.push(i);
  }
  return out;
}

const language = z.string().trim().min(1).max(40);

export const ProfileSchema = z
  .object({
    learningLanguage: language,
    nativeLanguage: language,
    level: z.enum(LEVELS),
    knownWords: z.number().int().min(0).max(5000).nullable(),
    cefr: z.string().max(4).nullable(),
    goal: z.enum(GOALS),
    goalOther: z.string().trim().max(80).nullable(),
    interests: z
      .array(z.enum(INTERESTS))
      .min(1)
      .max(MAX_INTERESTS)
      .refine((list) => new Set(list).size === list.length, 'interests must be different'),
  })
  .openapi('Profile');

export type Profile = z.infer<typeof ProfileSchema>;
