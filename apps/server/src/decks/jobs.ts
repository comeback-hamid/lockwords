import type { DecksStore, ProfilesStore } from '../app.js';
import { checkCards, type DeckInput, type DeckMaker, type NewCard } from '../llm/make-deck.js';

// Making a deck's words is a job, so a slow AI call never hangs on one web request.
// 'queued' = a worker makes the words in the background; the caller watches the deck's status.
export type DeckJobs = { start(userId: string, deckId: string): Promise<'ready' | 'failed' | 'queued'> };
export type DeckJobDeps = { profiles: ProfilesStore; decks: DecksStore; deckMaker: DeckMaker; now?: () => number };

// vocab-engine 2.4: retry once only when the first try failed fast (a slow failure would make the learner wait twice).
export const FAST_FAILURE_MS = 12_000;

async function cardsWithRetry(deckMaker: DeckMaker, input: DeckInput, now: () => number): Promise<NewCard[]> {
  const started = now();
  try {
    return checkCards(await deckMaker.cards(input), input.wordCount);
  } catch (error) {
    if (now() - started >= FAST_FAILURE_MS) throw error;
    return checkCards(await deckMaker.cards(input), input.wordCount);
  }
}

// The job itself. true = the deck is ready. On any failure nothing is saved.
export async function makeDeckCards({ profiles, decks, deckMaker, now = Date.now }: DeckJobDeps, userId: string, deckId: string): Promise<boolean> {
  try {
    const deck = await decks.get(userId, deckId);
    if (!deck) return false;
    if (deck.status === 'ready') return true; // a job that runs twice makes one set of words
    const profile = await profiles.get(userId);
    const input: DeckInput = {
      topic: deck.topic, cefr: deck.cefr, wordCount: deck.wordCount, // the deck's own size
      learningLanguage: profile?.learningLanguage ?? '', nativeLanguage: profile?.nativeLanguage ?? '',
      level: profile?.level ?? 'some_basics', knownWords: profile?.knownWords ?? null,
      goal: profile?.goal ?? 'other', goalOther: profile?.goalOther ?? null, interests: profile?.interests ?? [],
    };
    const cards = await cardsWithRetry(deckMaker, input, now); // checked: never trust the model's shape
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
