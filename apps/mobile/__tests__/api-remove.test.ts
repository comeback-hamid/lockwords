import { createApi } from '@/api/client';

const apiWith = (status: number, seen: Request[] = []) =>
  createApi({
    baseUrl: 'http://api.test',
    getToken: async () => 'tok',
    fetch: (async (req: Request) => {
      seen.push(req);
      return status === 204 ? new Response(null, { status }) : new Response(JSON.stringify({ error: 'x' }), { status, headers: { 'Content-Type': 'application/json' } });
    }) as unknown as typeof fetch,
  });

test('removeCard sends DELETE /v1/cards/{id} with the token; 204 is a success', async () => {
  const seen: Request[] = [];
  await expect(apiWith(204, seen).removeCard('c1')).resolves.toBeUndefined();
  expect(seen.map((r) => [r.method, r.url, r.headers.get('Authorization')])).toEqual([['DELETE', 'http://api.test/v1/cards/c1', 'Bearer tok']]);
});

test('removeDeck sends DELETE /v1/decks/{id}; 204 is a success', async () => {
  const seen: Request[] = [];
  await expect(apiWith(204, seen).removeDeck('d1')).resolves.toBeUndefined();
  expect(seen.map((r) => [r.method, r.url])).toEqual([['DELETE', 'http://api.test/v1/decks/d1']]);
});

test('a 404, a 409 and a 500 throw', async () => {
  await expect(apiWith(404).removeCard('c1')).rejects.toThrow();
  await expect(apiWith(409).removeDeck('d1')).rejects.toThrow();
  await expect(apiWith(500).removeDeck('d1')).rejects.toThrow();
});
