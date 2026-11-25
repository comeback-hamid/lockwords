import { api } from '@/auth/boot';
import { syncWidget } from '@/widgets/sync';
import { poseOf, toTimeline, type WidgetProps } from '@/widgets/timeline';

const mockUpdateTimeline = jest.fn();
jest.mock('@/widgets/lockwords-widget', () => ({ __esModule: true, default: { updateTimeline: (...a: unknown[]) => mockUpdateTimeline(...a) } }));
jest.mock('@/widgets/kai-files', () => ({ kaiFiles: jest.fn(async () => ({ greeting: 'file:///w/kai-greeting.png', idle: 'file:///w/kai-idle.png', thinking: 'file:///w/kai-thinking.png', speaking: 'file:///w/kai-speaking.png', celebrate: 'file:///w/kai-celebrate.png' })) }));
jest.mock('@/auth/boot', () => ({ api: { fetchWidgetPlan: jest.fn() } }));
jest.mock('@/auth/me-store', () => ({ getMe: jest.fn(() => ({ id: 'u1' })) }));

const mockApi = jest.mocked(api);
const kai = { greeting: 'g', idle: 'i', thinking: 't', speaking: 's', celebrate: 'c' };
const now = new Date('2026-11-25T09:10:00Z');
const slot = (at: string, n: number, look: number) => ({ at, cardId: `c${n}`, word: `w${n}`, translation: `t${n}`, look });
const plan = { slots: [slot('2026-11-25T09:00:00.000Z', 1, 3), slot('2026-11-25T09:30:00.000Z', 2, 1)], endsAt: '2026-11-25T10:00:00.000Z' };

beforeEach(() => jest.clearAllMocks());

test('Kai’s pose follows the look: waves, rests, thinks, speaks, cheers', () => {
  expect([1, 2, 3, 4, 5].map(poseOf)).toEqual(['greeting', 'idle', 'thinking', 'speaking', 'celebrate']);
  expect(poseOf(0)).toBe('idle');
});

test('a plan becomes one entry per slot and a last "open the app" entry', () => {
  const entries = toTimeline(plan, now, kai);
  expect(entries.map((e) => e.date.toISOString())).toEqual(['2026-11-25T09:00:00.000Z', '2026-11-25T09:30:00.000Z', '2026-11-25T10:00:00.000Z']);
  expect(entries[0]!.props).toEqual<WidgetProps>({ kind: 'word', word: 'w1', meaning: 't1', look: 3, kai: 't', url: 'lockwords://review?first=c1' });
  expect(entries[1]!.props).toMatchObject({ kind: 'word', word: 'w2', look: 1, kai: 'g', url: 'lockwords://review?first=c2' });
  expect(entries[2]!.props).toEqual<WidgetProps>({ kind: 'stale', word: 'Open Lockwords', meaning: 'for your hard words', look: 0, kai: 'g', url: 'lockwords://review' });
});

test('no hard words: one "no hard words" entry, from now', () => {
  expect(toTimeline({ slots: [], endsAt: null }, now, kai)).toEqual([{ date: now, props: { kind: 'empty', word: 'No hard words', meaning: 'Swipe left in Review', look: 0, kai: 'i', url: 'lockwords://review' } }]);
});

test('at night the first word shows at once, though its slot starts in the morning', () => {
  const night = new Date('2026-11-25T23:30:00Z');
  const entries = toTimeline({ slots: [slot('2026-11-26T07:00:00.000Z', 1, 2)], endsAt: '2026-11-26T07:30:00.000Z' }, night, kai);
  expect(entries[0]).toEqual({ date: night, props: expect.objectContaining({ word: 'w1', look: 2 }) });
  expect(entries[1]!.date.toISOString()).toBe('2026-11-26T07:00:00.000Z');
});

test('syncWidget loads the plan and hands the timeline to the widget', async () => {
  mockApi.fetchWidgetPlan.mockResolvedValue(plan);
  await syncWidget(now);
  expect(mockUpdateTimeline).toHaveBeenCalledTimes(1);
  const entries = mockUpdateTimeline.mock.calls[0]![0] as { props: WidgetProps }[];
  expect(entries).toHaveLength(3);
  expect(entries[0]!.props.kai).toBe('file:///w/kai-thinking.png');
});

test('the plan cannot be loaded: the widget keeps what it had, and nothing throws', async () => {
  mockApi.fetchWidgetPlan.mockRejectedValue(new Error('down'));
  await expect(syncWidget(now)).resolves.toBeUndefined();
  expect(mockUpdateTimeline).not.toHaveBeenCalled();
});

test('signed out: nothing is loaded', async () => {
  jest.mocked(jest.requireMock('@/auth/me-store').getMe).mockReturnValueOnce(null);
  await syncWidget(now);
  expect(mockApi.fetchWidgetPlan).not.toHaveBeenCalled();
});

test('the web app has no widget', () => {
  const web = jest.requireActual('@/widgets/sync.web');
  expect(web.syncWidget()).resolves.toBeUndefined();
});
