import { z } from 'zod';

// AI task: make a first deck. One interface; the fixture and the real model both implement it.
export type DeckInput = { topic: string; learningLanguage: string; nativeLanguage: string; cefr: string };

export const ProposalSchema = z.object({ title: z.string().min(1).max(120), reason: z.string().min(1).max(60) });
export const CardSchema = z.object({
  word: z.string().min(1).max(60),
  translation: z.string().min(1).max(120),
  example: z.string().min(1).max(240),
  exampleTranslation: z.string().min(1).max(240),
});
export const DECK_SIZE = 10;
export const CardsSchema = z.object({ cards: z.array(CardSchema).length(DECK_SIZE) });

export type NewCard = z.infer<typeof CardSchema>;
export type DeckMaker = {
  propose(input: DeckInput): Promise<z.infer<typeof ProposalSchema>>;
  cards(input: DeckInput): Promise<NewCard[]>;
};
