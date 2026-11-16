import createClient from 'openapi-fetch';

import type { components, paths } from './schema';

export type Me = components['schemas']['Me'];

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
  return {
    client,
    async fetchMe(): Promise<Me> {
      const { data, error } = await client.GET('/v1/me');
      if (!data) throw new Error(error?.error ?? 'request failed');
      return data;
    },
  };
}
