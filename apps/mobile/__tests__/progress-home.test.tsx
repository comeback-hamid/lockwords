import { render, screen, waitFor } from '@testing-library/react-native';

import type { Progress } from '@/api/client';
import ProgressScreen from '@/app/(tabs)/progress';
import { api } from '@/auth/boot';

jest.mock('expo-router', () => ({ useRouter: () => ({ push: jest.fn() }), useFocusEffect: (fn: () => void) => jest.requireActual('react').useEffect(fn, [fn]) }));
jest.mock('@/auth/boot', () => ({ api: { fetchProgress: jest.fn() } }));
jest.mock('react-native-safe-area-context', () => ({ useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }) }));

const mockApi = jest.mocked(api);
const progress = (over: Partial<Progress> = {}): Progress => ({
  total: 52, new: 30, learning: 18, mastered: 4, decks: 2, goal: 100, masterBy: '2026-12-29', language: 'Spanish',
  grid: [...Array.from({ length: 4 }, () => 5), ...Array.from({ length: 18 }, () => 2), ...Array.from({ length: 30 }, () => 0)],
  trees: [[5, 5, 5, 5, 2, 2, 2, 2, 2, 2, 2, 2], []],
  ...over,
});
const show = async (p: Progress) => {
  mockApi.fetchProgress.mockResolvedValue(p);
  await render(<ProgressScreen />);
  await waitFor(() => expect(screen.getByText('words in your word bank')).toBeOnTheScreen());
};

beforeEach(() => jest.clearAllMocks());

test('the three counts, the date, the goal and the language', async () => {
  await show(progress());
  for (const text of ['30 new', '18 learning', '4 mastered', 'BY DEC 29', 'you’ll master', '100', 'new Spanish words']) expect(screen.getByText(text)).toBeOnTheScreen();
});

test('the grid: one square per word of the goal, the bank’s words first, the rest dark', async () => {
  await show(progress());
  expect(screen.getAllByTestId('grid-level')).toHaveLength(52);
  expect(screen.getAllByTestId('grid-empty')).toHaveLength(48);
  expect(screen.getByLabelText('52 of 100 words')).toBeOnTheScreen();
});

test('no words yet: 100 dark squares, "new words" with no language, only the ground in the meadow', async () => {
  await show(progress({ total: 0, new: 0, learning: 0, mastered: 0, decks: 0, grid: [], trees: [], language: '' }));
  expect(screen.queryAllByTestId('grid-level')).toHaveLength(0);
  expect(screen.getAllByTestId('grid-empty')).toHaveLength(100);
  expect(screen.getByText('new words')).toBeOnTheScreen();
  expect(screen.queryAllByTestId('meadow-leaf')).toHaveLength(0);
  expect(screen.getAllByTestId('meadow-ground').length).toBeGreaterThan(0);
});

test('the meadow: one tree per deck, one leaf per met word; Kai stands on the ground strip', async () => {
  await show(progress());
  expect(screen.getAllByTestId('meadow-leaf')).toHaveLength(12);
  expect(screen.getByLabelText('Your meadow: 2 trees')).toBeOnTheScreen();
  expect(screen.getByTestId('kai-canvas')).toBeOnTheScreen();
});

test('the date in another month', async () => {
  await show(progress({ masterBy: '2027-01-03' }));
  expect(screen.getByText('BY JAN 3')).toBeOnTheScreen();
});
