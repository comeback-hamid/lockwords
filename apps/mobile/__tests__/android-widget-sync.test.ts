import { api } from '@/auth/boot';
import { androidEntries } from '@/widgets/android-widget';
import { widgetHowTo } from '@/widgets/how-to';
import { syncWidget } from '@/widgets/sync.android';
import { toTimeline } from '@/widgets/timeline';

// The Android home screen widget gets the same plan as the iOS widgets: hard words only, 5 looks per word, a tap
// opens Review on that word. The server makes the plan; the app only hands it over (src/widgets/sync.android.ts).
const mockSetEntries = jest.fn();
jest.mock('expo', () => ({ requireOptionalNativeModule: () => ({ setEntries: (json: string) => mockSetEntries(json) }) }));
jest.mock('@/auth/boot', () => ({ api: { fetchWidgetPlan: jest.fn() } }));
const mockGetMe = jest.fn((): { id: string } | null => ({ id: 'u1' }));
jest.mock('@/auth/me-store', () => ({ getMe: () => mockGetMe() }));

const mockApi = jest.mocked(api);
const now = new Date('2026-11-25T09:10:00Z');
const slot = (at: string, n: number, look: number, example?: string) => ({ at, cardId: `c${n}`, word: `w${n}`, translation: `t${n}`, look, ...(example ? { example } : {}) });
const plan = { slots: [slot('2026-11-25T09:00:00.000Z', 1, 3, 'I see w1 here'), slot('2026-11-25T09:30:00.000Z', 2, 1)], endsAt: '2026-11-25T10:00:00.000Z' };
const NO_KAI = { greeting: '', idle: '', thinking: '', speaking: '', celebrate: '' };

beforeEach(() => {
  jest.clearAllMocks();
  mockGetMe.mockReturnValue({ id: 'u1' });
});

test('the plan reaches the widget as plain entries: when, the word, its look, where a tap goes', async () => {
  mockApi.fetchWidgetPlan.mockResolvedValue(plan);
  await syncWidget(now);
  expect(mockSetEntries).toHaveBeenCalledTimes(1);
  const entries = JSON.parse(mockSetEntries.mock.calls[0]![0] as string);
  expect(entries).toEqual([
    { at: Date.parse('2026-11-25T09:00:00.000Z'), kind: 'word', word: 'w1', meaning: 't1', look: 3, url: 'lockwords://review?first=c1', example: 'I see **w1** here' },
    { at: Date.parse('2026-11-25T09:30:00.000Z'), kind: 'word', word: 'w2', meaning: 't2', look: 1, url: 'lockwords://review?first=c2', example: '' },
    { at: Date.parse('2026-11-25T10:00:00.000Z'), kind: 'stale', word: 'Open Lockwords', meaning: 'for your hard words', look: 0, url: 'lockwords://review', example: '' },
  ]);
});

test('the same entries as the iOS widgets, in the same order (one rule for both phones)', () => {
  const timeline = toTimeline(plan, now, NO_KAI);
  expect(androidEntries(timeline).map((e) => [e.at, e.word, e.look, e.url])).toEqual(timeline.map((e) => [e.date.getTime(), e.props.word, e.props.look, e.props.url]));
});

test('no hard words: the widget says so', async () => {
  mockApi.fetchWidgetPlan.mockResolvedValue({ slots: [], endsAt: null });
  await syncWidget(now);
  const entries = JSON.parse(mockSetEntries.mock.calls[0]![0] as string);
  expect(entries).toEqual([{ at: now.getTime(), kind: 'empty', word: 'No hard words', meaning: 'Swipe left in Review', look: 0, url: 'lockwords://review', example: '' }]);
});

test('no connection: the widget keeps what it had, and nothing is thrown', async () => {
  mockApi.fetchWidgetPlan.mockRejectedValue(new Error('offline'));
  await expect(syncWidget(now)).resolves.toBeUndefined();
  expect(mockSetEntries).not.toHaveBeenCalled();
});

test('not signed in yet: nothing is loaded', async () => {
  mockGetMe.mockReturnValue(null);
  await syncWidget(now);
  expect(mockApi.fetchWidgetPlan).not.toHaveBeenCalled();
});

// Android phones have no lock screen widgets: the one-time screen after the first round says how to add the
// home screen widget there.
test('how to add the widget: the lock screen on iOS, the home screen on Android', () => {
  expect(widgetHowTo('ios')).toBe('Hold your lock screen, tap Customize, then add Lockwords.');
  expect(widgetHowTo('android')).toBe('Hold your home screen, tap Widgets, then add Lockwords.');
});
