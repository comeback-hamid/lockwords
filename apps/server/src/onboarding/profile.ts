import { z } from '@hono/zod-openapi';

export const LEVELS = ['brand_new', 'beginner', 'some_basics', 'intermediate', 'advanced'] as const;
export const GOALS = ['travel', 'work', 'move_abroad', 'family_friends', 'brain', 'school', 'other'] as const;
export const INTERESTS = [
  'food', 'travel', 'work', 'business', 'tech', 'science', 'music', 'movies', 'books', 'sports', 'fitness', 'health',
  'nature', 'animals', 'art', 'fashion', 'gaming', 'news', 'family', 'friends_dating', 'shopping', 'cooking', 'money', 'culture',
] as const;

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
      .max(INTERESTS.length)
      .refine((list) => new Set(list).size === list.length, 'interests must be different'),
  })
  .openapi('Profile');

export type Profile = z.infer<typeof ProfileSchema>;
