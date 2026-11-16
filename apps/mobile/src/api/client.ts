import createClient from 'openapi-fetch';

import type { components, paths } from './schema';

export type Me = components['schemas']['Me'];
export type WordTest = components['schemas']['WordTest'];
export type Estimate = components['schemas']['Estimate'];
export type Profile = components['schemas']['Profile'];
export type Deck = components['schemas']['Deck'];
export type ProfileChat = components['schemas']['ProfileChat'];
export type ReviewCard = components['schemas']['ReviewCard'];
export type SwipeResult = components['schemas']['SwipeResult'];
export type UseItResult = components['schemas']['UseItResult'];
export type HardWord = components['schemas']['HardWords']['words'][number];
export type Direction = 'easy' | 'hard' | 'known';

type Options = { baseUrl: string; getToken(): Promise<string | null>; fetch?: typeof fetch };

// The one place the app talks to our server. Types come from the server's OpenAPI file (npm run api:gen).
export function createApi({ baseUrl, getToken, fetch: customFetch }: Options) {
  const client = createClient<paths>({ baseUrl, fetch: customFetch });
  client.use({
    async onRequest({ request }) {
      const token = await getToken();
      if (token) request.headers.set('Authorization', `Bearer ${token}`);
      return request;
    },
  });
  // Turns "no data" (network error, 4xx, 5xx) into a thrown error so callers have one failure path.
  const unwrap = <T>(result: { data?: T }): T => {
    if (result.data === undefined) throw new Error('request failed');
    return result.data;
  };
  return {
    client,
    async fetchWordTest(language: string): Promise<WordTest> {
      return unwrap(await client.GET('/v1/word-test', { params: { query: { language } } }));
    },
    async fetchEstimate(language: string, known: string[]): Promise<Estimate> {
      return unwrap(await client.POST('/v1/word-test/estimate', { body: { language, known } }));
    },
    async saveChat(chat: ProfileChat): Promise<ProfileChat> {
      return unwrap(await client.PUT('/v1/profile/chat', { body: chat }));
    },
    async fetchDeckIdeas(): Promise<string[]> {
      return unwrap(await client.GET('/v1/deck-ideas')).ideas;
    },
    async proposeDeck(topic: string): Promise<Deck> {
      return unwrap(await client.POST('/v1/decks', { body: { topic } }));
    },
    async generateDeck(id: string): Promise<Deck> {
      return unwrap(await client.POST('/v1/decks/{id}/generate', { params: { path: { id } } }));
    },
    async fetchDeck(id: string): Promise<Deck> {
      return unwrap(await client.GET('/v1/decks/{id}', { params: { path: { id } } }));
    },
    async fetchRound(): Promise<ReviewCard[]> {
      return unwrap(await client.GET('/v1/review')).cards;
    },
    async swipeCard(id: string, direction: Direction): Promise<SwipeResult> {
      return unwrap(await client.POST('/v1/cards/{id}/swipe', { params: { path: { id } }, body: { direction } }));
    },
    async fetchHardWords(): Promise<HardWord[]> {
      return unwrap(await client.GET('/v1/hard-words')).words;
    },
    async useIt(id: string, sentence: string): Promise<UseItResult> {
      return unwrap(await client.POST('/v1/cards/{id}/use-it', { params: { path: { id } }, body: { sentence } }));
    },
    async saveProfile(profile: Profile): Promise<Profile> {
      return unwrap(await client.PUT('/v1/profile', { body: profile }));
    },
    async fetchMe(): Promise<Me> {
      const { data, error } = await client.GET('/v1/me');
      if (!data) throw new Error(error?.error ?? 'request failed');
      return data;
    },
  };
}
