import { createApi, type Deck } from '@/api/client';

const deck = (status: Deck['status']): Deck => ({ id: 'd1', topic: 'Food', title: 't', reason: 'r', cefr: 'A1', wordCount: 10, status, cards: [] });
const answer = (body: unknown) => new Response(JSON.stringify(body), { status: 200, headers: { 'Content-Type': 'application/json' } });
// The server answers each call with the next status in the list.
const apiWith = (statuses: Deck['status'][]) => {
  const calls: string[] = [];
  const fetchMock = jest.fn(async (req: Request) => {
    calls.push(`${req.method} ${new URL(req.url).pathname}`);
    return answer(deck(statuses.shift()!));
  });
  return { calls, api: createApi({ baseUrl: 'http://api.test', getToken: async () => 'tok', fetch: fetchMock as unknown as typeof fetch, deckPollMs: 1 }) };
};

test('a deck that is ready at once needs one call', async () => {
  const { api, calls } = apiWith(['ready']);
  expect((await api.generateDeck('d1')).status).toBe('ready');
  expect(calls).toEqual(['POST /v1/decks/d1/generate']);
});

test('a deck that is still being made is read again until it is ready', async () => {
  const { api, calls } = apiWith(['generating', 'generating', 'ready']);
  expect((await api.generateDeck('d1')).status).toBe('ready');
  expect(calls).toEqual(['POST /v1/decks/d1/generate', 'GET /v1/decks/d1', 'GET /v1/decks/d1']);
});

test('a deck that falls back to proposed means the job failed', async () => {
  const { api } = apiWith(['generating', 'proposed']);
  await expect(api.generateDeck('d1')).rejects.toThrow();
});
