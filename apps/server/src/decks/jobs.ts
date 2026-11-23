import type { DecksStore, PicturesStore, ProfilesStore } from '../app.js';
import type { SheetMaker } from '../llm/deck-pictures.js';
import { drawDeckPictures } from './pictures.js';
import { checkCards, type DeckInput, type DeckMaker, type NewCard } from '../llm/make-deck.js';

// Making a deck's words is a job, so a slow AI call never hangs on one web request.
// 'queued' = a worker makes the words in the background; the caller watches the deck's status.
// `idle` (the inline runner only): resolves when the pictures started by `start` are done. Tests wait on it.
export type DeckJobs = { start(userId: string, deckId: string): Promise<'ready' | 'failed' | 'queued'>; idle?(): Promise<void> };
// `pictures` + `sheetMaker` set = every deck gets pictures, drawn right after its words (decks/pictures.ts).
export type DeckJobDeps = { profiles: ProfilesStore; decks: DecksStore; deckMaker: DeckMaker; now?: () => number; pictures?: PicturesStore; sheetMaker?: SheetMaker };

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
export async function makeDeckCards({ profiles, decks, deckMaker, now = Date.now, pictures, sheetMaker }: DeckJobDeps, userId: string, deckId: string): Promise<boolean> {
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
    // Ready and "pictures are being made" land together, so the app never sees a ready deck that looks like it gets no pictures.
    await decks.saveCards(deckId, cards, !!(pictures && sheetMaker));
    return true;
  } catch {
    return false;
  }
}

// The whole job: the words, then the pictures. The pictures never change the answer: a deck with words is made.
export async function makeDeck(deps: DeckJobDeps, userId: string, deckId: string): Promise<boolean> {
  const ok = await makeDeckCards(deps, userId, deckId);
  if (ok && deps.pictures && deps.sheetMaker) await drawDeckPictures({ pictures: deps.pictures, sheetMaker: deps.sheetMaker, now: deps.now }, deckId);
  return ok;
}

// No queue (tests, and any setup without one): the words are made right away, inside the call. The pictures go on after it.
export function inlineDeckJobs(deps: DeckJobDeps): DeckJobs {
  let drawing: Promise<void> = Promise.resolve();
  return {
    async start(userId, deckId) {
      if (!(await makeDeckCards(deps, userId, deckId))) return 'failed';
      if (deps.pictures && deps.sheetMaker) drawing = drawDeckPictures({ pictures: deps.pictures, sheetMaker: deps.sheetMaker, now: deps.now }, deckId);
      return 'ready';
    },
    idle: () => drawing,
  };
}
