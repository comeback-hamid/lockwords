import { z } from 'zod';

import type { Profile } from '../onboarding/profile.js';

// AI task: the learner's word plan (Figma P1), three next decks for their goal. Kept per learner; see the plan route.
export type PlanInput = Pick<Profile, 'learningLanguage' | 'nativeLanguage' | 'level' | 'knownWords' | 'goal' | 'goalOther' | 'interests'> & { have: string[] }; // have = topics of the decks they already have
export const PLAN_SIZE = 3;
export const PlanItemSchema = z.object({ topic: z.string().trim().min(1).max(60), words: z.number().int().min(10).max(30), kind: z.enum(['words', 'phrases', 'words + phrases']) });
export const PlanSchema = z.object({ items: z.array(PlanItemSchema).min(1).max(6) });
export type PlanItem = z.infer<typeof PlanItemSchema>;
export type DeckPlanner = { plan(input: PlanInput): Promise<{ items: PlanItem[] }> };

const GOAL: Record<Profile['goal'], string> = { travel: 'travel', work: 'work', move_abroad: 'moving abroad', family_friends: 'family and friends', brain: 'keeping the brain sharp', school: 'school', other: 'other' };
// The goal in words, as the plan's heading shows it: the learner's own text for "other".
export const goalWords = (p: Pick<Profile, 'goal' | 'goalOther'>) => (p.goal === 'other' && p.goalOther ? p.goalOther : GOAL[p.goal]);

const same = (a: string, b: string) => a.trim().toLowerCase() === b.trim().toLowerCase();
// The ideas the learner does not have a deck for yet, each topic once.
export function openItems(items: PlanItem[], have: string[]): PlanItem[] {
  const out: PlanItem[] = [];
  for (const item of items) if (!have.some((h) => same(h, item.topic)) && !out.some((o) => same(o.topic, item.topic))) out.push(item);
  return out;
}

export const planPrompt = (i: PlanInput, language: string, native: string) =>
  `A learner who speaks ${native} is learning ${language}. Level: ${i.level}${i.knownWords != null ? ` (knows about ${i.knownWords} of the 5,000 most common words)` : ''}. Goal: ${goalWords(i)}. Interests: ${i.interests.join(', ') || 'none given'}.
They already have word decks about: ${i.have.length ? i.have.map((t) => `"${t}"`).join(', ') : 'nothing yet'}.
Plan their next ${PLAN_SIZE} word decks: the most useful situations for their goal that they do not have yet, in the order they should learn them.
For each: "topic" = a short name of the situation in ${native} (2 to 5 words, like "Getting around the city"), "words" = how many items the deck should have (10 to 30), "kind" = "words", "phrases" or "words + phrases" (beginners get words; higher levels get more phrases).
Answer with JSON only: {"items": [{"topic": string, "words": number, "kind": string}]}`;
