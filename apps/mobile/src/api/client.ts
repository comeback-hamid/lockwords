import createClient from 'openapi-fetch';

import type { components, paths } from './schema';

export type Me = components['schemas']['Me'];
export type WordTest = components['schemas']['WordTest'];
export type Estimate = components['schemas']['Estimate'];
export type Profile = components['schemas']['Profile'];

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
