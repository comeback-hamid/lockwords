import { OpenAPIHono } from '@hono/zod-openapi';

import { requireUser, type AuthSettings } from './auth.js';
import type { DeckJobs } from './decks/jobs.js';
import type { RandomWordsStore } from './decks/random-words.js';
import type { KaiStore } from './kai/chat.js';
import { health } from './routes/health.js';
import type { KaiChat } from './llm/kai-chat.js';
import type { DeckMaker, NewCard } from './llm/make-deck.js';
import type { KaiReplier } from './llm/kai-reply.js';
import type { LanguageChecker } from './llm/check-language.js';
import type { UseItJudge } from './llm/use-it.js';
import type { ScriptTranslator } from './llm/translate-script.js';
import type { WordAsker } from './llm/ask-word.js';
import type { Profile } from './onboarding/profile.js';
import type { ReviewDay } from './review/day.js';
import type { CardState, Direction, Today } from './review/srs.js';
import type { TodayEvent } from './review/summary.js';
import { deckRoutes, type Deck } from './routes/decks.js';
import { kaiRoutes } from './routes/kai.js';
import { kaiChatRoutes } from './routes/kai-chat.js';
import { languageRoutes } from './routes/languages.js';
import { meRoutes } from './routes/me.js';
import { onboardingRoutes } from './routes/onboarding.js';
import { reviewRoutes } from './routes/review.js';
import { wordTestRoutes } from './routes/word-test.js';
import type { WordPackMaker } from './llm/word-pack.js';
import type { WordTestStore } from './onboarding/word-test-store.js';

export type UsersStore = {
  upsert(id: string, isGuest: boolean): Promise<{ id: string; isGuest: boolean; createdAt: Date }>;
};
export type ProfilesStore = {
  upsert(userId: string, profile: Profile): Promise<Profile>;
  get(userId: string): Promise<Profile | null>;
  setChat(userId: string, name: string, chatLanguage: 'native' | 'target'): Promise<boolean>; // false = no profile yet
};
export type DecksStore = {
  create(userId: string, deck: Pick<Deck, 'topic' | 'title' | 'reason' | 'cefr'>): Promise<Deck>; // a deck of 10 with no title translation (onboarding)
  get(userId: string, id: string): Promise<Deck | null>; // null also for another user's deck
  saveCards(id: string, cards: NewCard[]): Promise<Deck>; // also sets the deck to ready
  // Marks the deck and its cards as removed. `not_found` also for another user's deck. Optional so older test fakes still fit.
  remove?(userId: string, id: string): Promise<'removed' | 'not_found' | 'generating'>;
};
// Kai's onboarding script in one language (key → line). null = not translated yet.
export type KaiScriptStore = { get(language: string): Promise<Record<string, string> | null>; save(language: string, lines: Record<string, string>): Promise<void> };
export type ReviewCard = { id: string; deckId: string; deckTopic: string; word: string; translation: string; example: string; exampleTranslation: string; stage: number; meaning?: string };
export type CardsStore = {
  round(userId: string, now: Date, today?: ReviewDay): Promise<(ReviewCard & CardState)[]>; // today = due by review day and the daily new-word limit
  // What the learner did with this card today, for the "is it in today's round" check. Stores without history leave both out.
  today?(userId: string, cardId: string, day: string): Promise<Today>;
  // Saves the card and its history row together.
  saveSwipe?(userId: string, cardId: string, event: { kind: Direction | 'use_it'; day: string; at: Date; before: CardState; after: CardState }): Promise<void>;
  // Takes back the learner's newest swipe of that review day. null = nothing to take back (none today, or the newest was already undone).
  undoLast?(userId: string, day: string): Promise<(ReviewCard & CardState) | null>;
  // What the summary is made of: the learner's name, the review days that have a swipe (newest first), and that day's swipes (oldest first).
  // Has the learner any history before this review day? false = this is their first day (Use it shows on every card).
  reviewedBefore?(userId: string, day: string): Promise<boolean>;
  history?(userId: string, day: string): Promise<{ name: string | null; days: string[]; events: TodayEvent[] }>;
  get(userId: string, id: string): Promise<(ReviewCard & CardState) | null>; // null also for another user's card
  save(id: string, patch: CardState): Promise<void>;
  hardWords(userId: string): Promise<{ word: string; translation: string }[]>;
  languages(userId: string): Promise<{ learningLanguage: string; nativeLanguage: string }>;
  remove?(userId: string, id: string): Promise<boolean>; // false = no such card for this user (or already removed)
};
// Everything after users is optional so tests of other routes do not have to fake it.
export type AppDeps = AuthSettings & { users: UsersStore; profiles?: ProfilesStore; decks?: DecksStore; deckMaker?: DeckMaker; cards?: CardsStore; useItJudge?: UseItJudge; wordAsker?: WordAsker; kaiReplier?: KaiReplier; deckJobs?: DeckJobs; deckWaitMs?: number; wordTests?: WordTestStore; wordPackMaker?: WordPackMaker; languageChecker?: LanguageChecker; kai?: KaiStore; kaiChat?: KaiChat; kaiNow?: () => Date; reviewNow?: () => Date; kaiScripts?: KaiScriptStore; scriptTranslator?: ScriptTranslator; randomWords?: RandomWordsStore };

// Without deps (some unit tests) every /v1 route answers 401.
export function createApp(deps?: AppDeps) {
  const app = new OpenAPIHono();
  app.route('/health', health);
  app.use('/v1/*', requireUser(deps));
  app.route('/v1', meRoutes(deps?.users));
  app.route('/v1', onboardingRoutes(deps?.users, deps?.profiles));
  app.route('/v1', wordTestRoutes(deps ?? {}));
  app.route('/v1', languageRoutes(deps?.languageChecker));
  app.route('/v1', deckRoutes(deps ?? {}));
  app.route('/v1', reviewRoutes(deps ?? {}));
  app.route('/v1', kaiRoutes(deps ?? {}));
  app.route('/v1', kaiChatRoutes(deps ?? {}));
  app.openAPIRegistry.registerComponent('securitySchemes', 'bearer', { type: 'http', scheme: 'bearer', bearerFormat: 'JWT' });
  app.doc31('/openapi.json', { openapi: '3.1.0', info: { title: 'Lockwords API', version: '1' } });
  return app;
}
