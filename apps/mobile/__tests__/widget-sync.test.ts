import { api } from '@/auth/boot';
import { syncWidget } from '@/widgets/sync';
import { markWord, poseOf, toTimeline, type WidgetProps } from '@/widgets/timeline';

const mockUpdateTimeline = jest.fn();
jest.mock('@/widgets/lockwords-widget', () => ({ __esModule: true, default: { updateTimeline: (...a: unknown[]) => mockUpdateTimeline(...a) } }));
jest.mock('@/widgets/kai-files', () => ({ kaiFiles: jest.fn(async () => ({ greeting: 'file:///w/kai-greeting.png', idle: 'file:///w/kai-idle.png', thinking: 'file:///w/kai-thinking.png', speaking: 'file:///w/kai-speaking.png', celebrate: 'file:///w/kai-celebrate.png' })) }));
const mockSavePictures = jest.fn(async (_slots: unknown): Promise<Record<string, string>> => ({}));
jest.mock('@/widgets/pictures', () => ({ savePictures: (slots: unknown) => mockSavePictures(slots) }));
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

// Hamid, 2026-11-25: the lock screen widget is small. A long word or meaning gets the whole width, with no Kai.
test('a long word or a long meaning has no Kai, so the text has the whole width', () => {
  const entry = (word: string, translation: string) => toTimeline({ slots: [{ at: '2026-11-25T09:00:00.000Z', cardId: 'c1', word, translation, look: 2 }], endsAt: '2026-11-25T09:30:00.000Z' }, now, kai)[0]!.props;
  expect(entry('la cuenta', 'the bill').kai).toBe('i');
  expect(entry('estar de acuerdo', 'to agree').kai).toBe(''); // a long word
  expect(entry('acordar', 'to agree with someone').kai).toBe(''); // a long meaning
  expect(entry('la propina', 'the tip').kai).toBe('i'); // 10 letters still fit next to Kai
  expect(entry('el camarero', 'the waiter').kai).toBe('i');
});

// Found in review, 2026-11-25.
test('Android has no widget yet: nothing is loaded', async () => {
  const { Platform } = jest.requireActual('react-native');
  jest.replaceProperty(Platform, 'OS', 'android');
  await syncWidget(now);
  expect(mockApi.fetchWidgetPlan).not.toHaveBeenCalled();
  jest.restoreAllMocks();
});

test('Kai’s pictures cannot be copied: the words still reach the widget, with no Kai', async () => {
  mockApi.fetchWidgetPlan.mockResolvedValue(plan);
  jest.mocked(jest.requireMock('@/widgets/kai-files').kaiFiles).mockRejectedValueOnce(new Error('no room'));
  await syncWidget(now);
  const entries = mockUpdateTimeline.mock.calls[0]![0] as { props: WidgetProps }[];
  expect(entries[0]!.props).toMatchObject({ word: 'w1', kai: '' });
});

// home-widgets: the home screen widgets also show the example, the word's picture and Kai in color.
test('an entry carries the example with the word marked, the saved picture and Kai in color', () => {
  const slots = [{ at: '2026-11-25T09:00:00.000Z', cardId: 'c1', word: 'la cuenta', translation: 'the bill', look: 3, example: '¿Nos trae la cuenta, por favor?', imageUrl: 'https://x.test/pictures/p1' }];
  const color = { greeting: 'G', idle: 'I', thinking: 'T', speaking: 'S', celebrate: 'C' };
  const [entry, last] = toTimeline({ slots, endsAt: '2026-11-25T09:30:00.000Z' }, now, kai, { color, pictures: { c1: 'file:///w/pic-p1.webp' } });
  expect(entry!.props).toMatchObject({ example: '¿Nos trae la **cuenta**, por favor?', picture: 'file:///w/pic-p1.webp', kaiColor: 'T' });
  expect(last!.props).toMatchObject({ kind: 'stale', kaiColor: 'G' });
});

test('a long word keeps Kai in color: only the small lock screen widget drops Kai', () => {
  const slots = [{ at: '2026-11-25T09:00:00.000Z', cardId: 'c1', word: 'estar de acuerdo', translation: 'to agree', look: 2, example: 'No estoy de acuerdo contigo.' }];
  const color = { greeting: 'G', idle: 'I', thinking: 'T', speaking: 'S', celebrate: 'C' };
  const props = toTimeline({ slots, endsAt: '2026-11-25T09:30:00.000Z' }, now, kai, { color })[0]!.props;
  expect(props).toMatchObject({ kai: '', kaiColor: 'I', example: 'No estoy **de acuerdo** contigo.' });
  expect(props.picture).toBeUndefined();
});

test('marks in the example cannot break the bold word', () => {
  expect(markWord('2 * 3 = *seis*', 'seis')).toBe('2  3 = **seis**');
  expect(markWord('Nothing to mark here.', 'la cuenta')).toBe('Nothing to mark here.');
  expect(markWord('Mira [aquí](x) ~~no~~ \\ seis', 'seis')).toBe('Mira aquí(x) no  **seis**');
});

test('syncWidget saves the pictures of the plan and hands their files to the widget', async () => {
  mockApi.fetchWidgetPlan.mockResolvedValue({ slots: [{ ...slot('2026-11-25T09:00:00.000Z', 1, 3), example: 'An example with w1.', imageUrl: 'https://x.test/pictures/p1' }], endsAt: '2026-11-25T09:30:00.000Z' });
  mockSavePictures.mockResolvedValue({ c1: 'file:///w/pic-p1.webp' });
  await syncWidget(now);
  const entries = mockUpdateTimeline.mock.calls[0]![0] as { props: WidgetProps }[];
  expect(entries[0]!.props).toMatchObject({ picture: 'file:///w/pic-p1.webp', example: 'An example with **w1**.' });
  expect(mockSavePictures).toHaveBeenCalledWith([expect.objectContaining({ cardId: 'c1', imageUrl: 'https://x.test/pictures/p1' })]);
});

test('the pictures cannot be saved: the words still reach the widget', async () => {
  mockApi.fetchWidgetPlan.mockResolvedValue(plan);
  mockSavePictures.mockRejectedValue(new Error('no room'));
  await syncWidget(now);
  expect((mockUpdateTimeline.mock.calls[0]![0] as { props: WidgetProps }[])[0]!.props).toMatchObject({ word: 'w1' });
});
