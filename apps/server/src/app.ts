import { OpenAPIHono } from '@hono/zod-openapi';
import { cors } from 'hono/cors';

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
import type { DeckPlanner, PlanItem } from './llm/plan-decks.js';
import type { ScriptTranslator } from './llm/translate-script.js';
import type { WordAsker } from './llm/ask-word.js';
import type { Profile } from './onboarding/profile.js';
import type { ReviewDay } from './review/day.js';
import type { CardState, Direction, Today } from './review/srs.js';
import type { TodayEvent } from './review/summary.js';
import { deckRoutes, type Deck } from './routes/decks.js';
import { pictureRoutes } from './routes/pictures.js';
import { kaiRoutes } from './routes/kai.js';
import { kaiChatRoutes } from './routes/kai-chat.js';
import { languageRoutes } from './routes/languages.js';
import { meRoutes } from './routes/me.js';
import { onboardingRoutes } from './routes/onboarding.js';
import { progressRoutes } from './routes/progress.js';
import { reviewRoutes } from './routes/review.js';
import { transcribeRoutes } from './routes/transcribe.js';
import type { Transcriber } from './llm/transcribe.js';
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
  create(userId: string, deck: Pick<Deck, 'topic' | 'title' | 'reason' | 'cefr'> & { titleTranslation?: string | null }): Promise<Deck>; // a deck of 10 (onboarding)
  get(userId: string, id: string): Promise<Deck | null>; // null also for another user's deck
  saveCards(id: string, cards: NewCard[], pictures?: boolean): Promise<Deck>; // also sets the deck to ready; pictures = they are being made now
  // Marks the deck and its cards as removed. `not_found` also for another user's deck. Optional so older test fakes still fit.
  remove?(userId: string, id: string): Promise<'removed' | 'not_found' | 'generating'>;
};
// The learner's kept word plan. null = none yet.
export type PlanStore = { get(userId: string): Promise<{ items: PlanItem[]; createdAt: Date } | null>; save(userId: string, items: PlanItem[], now: Date): Promise<void> };
// The rows the Progress tab is counted from.
export type ProgressStore = {
  decks(userId: string): Promise<{ id: string; topic: string; title: string; cefr: string; kind: 'topic' | 'random'; words: { stage: number; known: boolean; hard: boolean }[] }[]>;
  startedSince(userId: string, day: string): Promise<number>;
  learningLanguage(userId: string): Promise<string>; // the profile's value (a code or a name); '' with no profile
};
// Kai's onboarding script in one language (key → line). null = not translated yet.
export type KaiScriptStore = { get(language: string): Promise<Record<string, string> | null>; save(language: string, lines: Record<string, string>): Promise<void> };
// Card pictures (decks/pictures.ts). A picture is a small WebP kept in our database and served at /pictures/<id>.
export type PicturesStore = {
  todo(deckId: string): Promise<{ cardId: string; word: string; translation: string; pictureHint?: string | null }[]>; // cards with no picture yet, in order
  save(deckId: string, pictures: { cardId: string; data: Buffer }[]): Promise<void>;
  finish(deckId: string, status: 'ready' | 'failed'): Promise<void>; // ready = every card has its picture
  read(id: string): Promise<Buffer | null>;
};
export type ReviewCard = { id: string; deckId: string; deckTopic: string; word: string; translation: string; example: string; exampleTranslation: string; stage: number; meaning?: string; imageUrl?: string | null }; // imageUrl: the stored path, the route makes it a full address
export type CardsStore = {
  round(userId: string, now: Date, today?: ReviewDay, deckId?: string): Promise<(ReviewCard & CardState)[]>; // today = due by review day and the daily new-word limit
  // What the learner did with this card today, for the "is it in today's round" check. Stores without history leave both out.
  today?(userId: string, cardId: string, day: string): Promise<Today>;
  // Saves the card and its history row together.
  saveSwipe?(userId: string, cardId: string, event: { kind: Direction | 'use_it'; day: string; at: Date; before: CardState; after: CardState }): Promise<void>;
  // Takes back the learner's newest swipe of that review day. null = nothing to take back (none today, or the newest was already undone).
  undoLast?(userId: string, day: string): Promise<(ReviewCard & CardState) | null>;
  // What the summary is made of: the learner's name, the review days that have a swipe (newest first), and that day's swipes (oldest first).
  // Has the learner any history before this review day? false = this is their first day (Use it shows on every card).
  reviewedBefore?(userId: string, day: string): Promise<boolean>;
  // Brings back a card marked "I know it". 'not_known' = the card is not known; 'not_found' = no such card for this user.
  restore?(userId: string, id: string, now: Date): Promise<{ id: string; stage: number } | 'not_known' | 'not_found'>;
  history?(userId: string, day: string): Promise<{ name: string | null; days: string[]; events: TodayEvent[] }>;
  get(userId: string, id: string): Promise<(ReviewCard & CardState) | null>; // null also for another user's card
  save(id: string, patch: CardState): Promise<void>;
  hardWords(userId: string): Promise<{ word: string; translation: string }[]>;
  languages(userId: string): Promise<{ learningLanguage: string; nativeLanguage: string; chatLanguage?: string | null }>; // chatLanguage: 'native' | 'target', the language Kai speaks in chats
  remove?(userId: string, id: string): Promise<boolean>; // false = no such card for this user (or already removed)
};
// Everything after users is optional so tests of other routes do not have to fake it.
export type AppDeps = AuthSettings & { users: UsersStore; profiles?: ProfilesStore; decks?: DecksStore; deckMaker?: DeckMaker; cards?: CardsStore; transcriber?: Transcriber; useItJudge?: UseItJudge; wordAsker?: WordAsker; kaiReplier?: KaiReplier; deckJobs?: DeckJobs; deckWaitMs?: number; wordTests?: WordTestStore; wordPackMaker?: WordPackMaker; languageChecker?: LanguageChecker; kai?: KaiStore; kaiChat?: KaiChat; kaiNow?: () => Date; reviewNow?: () => Date; webOrigins?: string[]; progress?: ProgressStore; plans?: PlanStore; deckPlanner?: DeckPlanner; kaiScripts?: KaiScriptStore; scriptTranslator?: ScriptTranslator; randomWords?: RandomWordsStore; pictures?: PicturesStore };

// Without deps (some unit tests) every /v1 route answers 401.
export function createApp(deps?: AppDeps) {
  const app = new OpenAPIHono();
  // The web app calls us from a browser, from another address than ours: answer its pre-flight calls and say it may.
  // Phones do not need this. Allowed: the addresses in `webOrigins`, and any localhost port while developing.
  app.use(
    '*',
    cors({
      origin: (origin) => (origin && (deps?.webOrigins?.includes(origin) || /^http:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(origin)) ? origin : null),
      allowHeaders: ['Authorization', 'Content-Type', 'X-Time-Zone'],
      allowMethods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
      maxAge: 86400,
    }),
  );
  app.route('/health', health);
  app.route('/pictures', pictureRoutes(deps?.pictures));
  app.use('/v1/*', requireUser(deps));
  app.route('/v1', meRoutes(deps?.users));
  app.route('/v1', onboardingRoutes(deps?.users, deps?.profiles));
  app.route('/v1', wordTestRoutes(deps ?? {}));
  app.route('/v1', languageRoutes(deps?.languageChecker));
  app.route('/v1', deckRoutes(deps ?? {}));
  app.route('/v1', reviewRoutes(deps ?? {}));
  app.route('/v1', transcribeRoutes(deps?.transcriber, deps?.cards ? (userId) => deps.cards!.languages(userId) : undefined));
  app.route('/v1', progressRoutes(deps ?? {}));
  app.route('/v1', kaiRoutes({ ...(deps ?? {}), chatLanguages: deps?.cards ? (userId) => deps.cards!.languages(userId) : undefined }));
  app.route('/v1', kaiChatRoutes(deps ?? {}));
  app.openAPIRegistry.registerComponent('securitySchemes', 'bearer', { type: 'http', scheme: 'bearer', bearerFormat: 'JWT' });
  app.doc31('/openapi.json', { openapi: '3.1.0', info: { title: 'Lockwords API', version: '1' } });
  return app;
}
