import type { DecksStore, ProfilesStore } from '../app.js';
import { CardsSchema, type DeckMaker } from '../llm/make-deck.js';

// Making a deck's words is a job, so a slow AI call never hangs on one web request.
// 'queued' = a worker makes the words in the background; the caller watches the deck's status.
export type DeckJobs = { start(userId: string, deckId: string): Promise<'ready' | 'failed' | 'queued'> };
export type DeckJobDeps = { profiles: ProfilesStore; decks: DecksStore; deckMaker: DeckMaker };

// The job itself. true = the deck is ready. On any failure nothing is saved.
export async function makeDeckCards({ profiles, decks, deckMaker }: DeckJobDeps, userId: string, deckId: string): Promise<boolean> {
  try {
    const deck = await decks.get(userId, deckId);
    if (!deck) return false;
    if (deck.status === 'ready') return true; // a job that runs twice makes one set of words
    const profile = await profiles.get(userId);
    const made = await deckMaker.cards({ topic: deck.topic, learningLanguage: profile?.learningLanguage ?? '', nativeLanguage: profile?.nativeLanguage ?? '', cefr: deck.cefr });
    const { cards } = CardsSchema.parse({ cards: made }); // never trust the model's shape
    await decks.saveCards(deckId, cards);
    return true;
  } catch {
    return false;
  }
}

// No queue (tests, and any setup without one): the job runs right away, inside the call.
export const inlineDeckJobs = (deps: DeckJobDeps): DeckJobs => ({
  start: async (userId, deckId) => ((await makeDeckCards(deps, userId, deckId)) ? 'ready' : 'failed'),
});
