import { OpenAPIHono } from '@hono/zod-openapi';

import { requireUser, type AuthSettings } from './auth.js';
import { health } from './routes/health.js';
import type { DeckMaker, NewCard } from './llm/make-deck.js';
import type { UseItJudge } from './llm/use-it.js';
import type { Profile } from './onboarding/profile.js';
import type { CardState } from './review/srs.js';
import { deckRoutes, type Deck } from './routes/decks.js';
import { meRoutes } from './routes/me.js';
import { onboardingRoutes } from './routes/onboarding.js';
import { reviewRoutes } from './routes/review.js';

export type UsersStore = {
  upsert(id: string, isGuest: boolean): Promise<{ id: string; isGuest: boolean; createdAt: Date }>;
};
export type ProfilesStore = {
  upsert(userId: string, profile: Profile): Promise<Profile>;
  get(userId: string): Promise<Profile | null>;
  setChat(userId: string, name: string, chatLanguage: 'native' | 'target'): Promise<boolean>; // false = no profile yet
};
export type DecksStore = {
  create(userId: string, deck: Pick<Deck, 'topic' | 'title' | 'reason' | 'cefr'>): Promise<Deck>;
  get(userId: string, id: string): Promise<Deck | null>; // null also for another user's deck
  saveCards(id: string, cards: NewCard[]): Promise<Deck>; // also sets the deck to ready
};
export type ReviewCard = { id: string; deckId: string; deckTopic: string; word: string; translation: string; example: string; exampleTranslation: string; stage: number };
export type CardsStore = {
  round(userId: string, now: Date): Promise<(ReviewCard & CardState)[]>;
  get(userId: string, id: string): Promise<(ReviewCard & CardState) | null>; // null also for another user's card
  save(id: string, patch: CardState): Promise<void>;
  hardWords(userId: string): Promise<{ word: string; translation: string }[]>;
  languages(userId: string): Promise<{ learningLanguage: string; nativeLanguage: string }>;
};
// Everything after users is optional so tests of other routes do not have to fake it.
export type AppDeps = AuthSettings & { users: UsersStore; profiles?: ProfilesStore; decks?: DecksStore; deckMaker?: DeckMaker; cards?: CardsStore; useItJudge?: UseItJudge };

// Without deps (some unit tests) every /v1 route answers 401.
export function createApp(deps?: AppDeps) {
  const app = new OpenAPIHono();
  app.route('/health', health);
  app.use('/v1/*', requireUser(deps));
  app.route('/v1', meRoutes(deps?.users));
  app.route('/v1', onboardingRoutes(deps?.profiles));
  app.route('/v1', deckRoutes(deps ?? {}));
  app.route('/v1', reviewRoutes(deps ?? {}));
  app.openAPIRegistry.registerComponent('securitySchemes', 'bearer', { type: 'http', scheme: 'bearer', bearerFormat: 'JWT' });
  app.doc31('/openapi.json', { openapi: '3.1.0', info: { title: 'Lockwords API', version: '1' } });
  return app;
}
