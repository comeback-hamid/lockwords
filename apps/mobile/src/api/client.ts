import createClient from 'openapi-fetch';

import type { components, paths } from './schema';

export type Me = components['schemas']['Me'];
export type WordTest = components['schemas']['WordTest'];
export type Estimate = components['schemas']['Estimate'];
export type TestAnswers = components['schemas']['TestAnswers'];
export type TestPage = 'A' | 'B' | 'C' | 'D';
export type LanguageCheck = components['schemas']['LanguageCheckResult'];
export type Profile = components['schemas']['Profile'];
export type Deck = components['schemas']['Deck'];
export type ProfileChat = components['schemas']['ProfileChat'];
export type ReviewCard = components['schemas']['ReviewCard'];
export type SwipeResult = components['schemas']['SwipeResult'];
export type UseItResult = components['schemas']['UseItResult'];
export type HardWord = components['schemas']['HardWords']['words'][number];
export type Direction = 'easy' | 'hard' | 'known';
export type KaiChat = components['schemas']['KaiChat'];
export type KaiMessage = components['schemas']['KaiMessage'];
export type KaiTurn = components['schemas']['KaiTurn'];
// A Kai turn can fail in two ways the screen treats differently, so it does not throw.
export type KaiTurnResult = { ok: true; turn: KaiTurn } | { ok: false; error: 'too_many_messages' | 'failed' };

type Options = { baseUrl: string; getToken(): Promise<string | null>; fetch?: typeof fetch; deckPollMs?: number };

const DECK_WAIT_MS = 180_000; // the server gives a deck job 3 minutes

// The one place the app talks to our server. Types come from the server's OpenAPI file (npm run api:gen).
export function createApi({ baseUrl, getToken, fetch: customFetch, deckPollMs = 2000 }: Options) {
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
  // One turn of the New words chat: the learner's text, or `open` for Kai's opening.
  async function kaiTurn(body: { text: string } | { open: true }): Promise<KaiTurnResult> {
    try {
      const { data, response } = await client.POST('/v1/kai/chat/turns', { body });
      if (data) return { ok: true, turn: data };
      return { ok: false, error: response.status === 429 ? 'too_many_messages' : 'failed' };
    } catch {
      return { ok: false, error: 'failed' };
    }
  }
  return {
    client,
    async fetchKaiChat(): Promise<KaiChat> {
      return unwrap(await client.GET('/v1/kai/chat'));
    },
    sendKaiMessage: (text: string) => kaiTurn({ text }),
    openKaiChat: () => kaiTurn({ open: true }),
    async setKaiTranslation(on: boolean): Promise<void> {
      unwrap(await client.PUT('/v1/kai/chat/translation', { body: { on } }));
    },
    async fetchWordTest(language: string): Promise<WordTest> {
      return unwrap(await client.GET('/v1/word-test', { params: { query: { language } } }));
    },
    // After page B or C: which page comes next, or null when the test is over. The server knows the made-up words.
    async fetchNextPage(language: string, known: TestAnswers): Promise<'C' | 'D' | null> {
      return unwrap(await client.POST('/v1/word-test/next', { body: { language, known } })).next;
    },
    async fetchEstimate(language: string, known: TestAnswers): Promise<Estimate> {
      return unwrap(await client.POST('/v1/word-test/estimate', { body: { language, known } }));
    },
    async checkLanguage(name: string): Promise<LanguageCheck> {
      return unwrap(await client.POST('/v1/languages/check', { body: { name } }));
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
    // The words are made by a background job. A slow job answers "generating": read the deck again until it is done.
    async generateDeck(id: string): Promise<Deck> {
      let deck = unwrap(await client.POST('/v1/decks/{id}/generate', { params: { path: { id } } }));
      const until = Date.now() + DECK_WAIT_MS;
      while (deck.status === 'generating' && Date.now() < until) {
        await new Promise((resolve) => setTimeout(resolve, deckPollMs));
        deck = unwrap(await client.GET('/v1/decks/{id}', { params: { path: { id } } }));
      }
      if (deck.status !== 'ready') throw new Error('deck not made'); // back to proposed = the job failed
      return deck;
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
