import { api } from '@/auth/boot';
import { SECURE_KEYS } from '@/auth/session-storage';
import { streakToShow } from '@/review/streak';

const mockStore = new Map<string, string>();
jest.mock('expo-secure-store', () => ({
  getItemAsync: jest.fn(async (k: string) => mockStore.get(k) ?? null),
  setItemAsync: jest.fn(async (k: string, v: string) => void mockStore.set(k, v)),
  deleteItemAsync: jest.fn(async (k: string) => void mockStore.delete(k)),
}));
jest.mock('@/auth/boot', () => ({ api: { fetchSummary: jest.fn() } }));

const mockApi = jest.mocked(api);
const summary = (day: string, streakDays: number) => ({ day, name: null, streakDays, today: { words: 1, minutes: 1, easy: 1, hard: 0, known: 0, stages: [2] } });

beforeEach(() => mockStore.clear());

test('a streak of 2 or more is shown once per review day', async () => {
  mockApi.fetchSummary.mockResolvedValue(summary('2026-11-20', 13));
  expect(await streakToShow()).toBe(13);
  expect(await streakToShow()).toBeNull(); // the same day again
  mockApi.fetchSummary.mockResolvedValue(summary('2026-11-21', 14));
  expect(await streakToShow()).toBe(14);
  expect(SECURE_KEYS).toContain('lockwords.streakShown'); // cleared on a fresh install
});

test('day 1 has no card, and a failed call shows nothing', async () => {
  mockApi.fetchSummary.mockResolvedValue(summary('2026-11-20', 1));
  expect(await streakToShow()).toBeNull();
  mockApi.fetchSummary.mockRejectedValue(new Error('down'));
  expect(await streakToShow()).toBeNull();
});
