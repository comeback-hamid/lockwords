import { createApi } from '@/api/client';

test('every call tells the server the phone time zone (the server counts review days with it)', async () => {
  const seen: (string | null)[] = [];
  const fetchMock = jest.fn(async (req: Request) => {
    seen.push(req.headers.get('X-Time-Zone'));
    return new Response(JSON.stringify({ cards: [] }), { status: 200, headers: { 'Content-Type': 'application/json' } });
  });
  const api = createApi({ baseUrl: 'http://api.test', getToken: async () => 'tok', fetch: fetchMock as unknown as typeof fetch });
  await api.fetchRound();
  expect(seen).toEqual([Intl.DateTimeFormat().resolvedOptions().timeZone]);
  expect(seen[0]).toBeTruthy();
});
