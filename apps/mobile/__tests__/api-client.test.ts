import { createApi } from '@/api/client';

test('GET /v1/me sends the bearer token and returns the answer', async () => {
  const me = { id: 'u1', isGuest: true, createdAt: '2026-11-16T00:00:00.000Z' };
  const fetchMock = jest.fn(async (req: Request) => {
    expect(req.url).toBe('http://api.test/v1/me');
    expect(req.headers.get('Authorization')).toBe('Bearer tok');
    return new Response(JSON.stringify(me), { status: 200, headers: { 'Content-Type': 'application/json' } });
  });
  const api = createApi({ baseUrl: 'http://api.test', getToken: async () => 'tok', fetch: fetchMock as unknown as typeof fetch });
  expect(await api.fetchMe()).toEqual(me);
});

test('a 401 answer throws (startSession turns that into "no user")', async () => {
  const fetchMock = jest.fn(async () => new Response(JSON.stringify({ error: 'unauthorized' }), { status: 401, headers: { 'Content-Type': 'application/json' } }));
  const api = createApi({ baseUrl: 'http://api.test', getToken: async () => 'bad', fetch: fetchMock as unknown as typeof fetch });
  await expect(api.fetchMe()).rejects.toThrow();
});
