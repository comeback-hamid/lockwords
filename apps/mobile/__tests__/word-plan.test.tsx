import { fireEvent, render, screen, waitFor } from '@testing-library/react-native';

import type { Progress, WordPlan } from '@/api/client';
import ProgressScreen from '@/app/(tabs)/progress';
import { api } from '@/auth/boot';
import { takePendingAsk } from '@/new-words/pending';

const mockRouter = { push: jest.fn(), navigate: jest.fn() };
jest.mock('expo-router', () => ({ useRouter: () => mockRouter, useFocusEffect: (fn: () => void) => jest.requireActual('react').useEffect(fn, [fn]) }));
jest.mock('@/auth/boot', () => ({ api: { fetchProgress: jest.fn(), fetchPlan: jest.fn() } }));
jest.mock('react-native-safe-area-context', () => ({ useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }) }));

const mockApi = jest.mocked(api);
const progress: Progress = { total: 10, new: 10, learning: 0, mastered: 0, decks: 1, goal: 100, masterBy: '2026-12-29', language: 'Spanish', grid: [0], trees: [[]] };
const plan: WordPlan = {
  goal: 'travel',
  items: [
    { topic: 'Getting around the city', words: 30, kind: 'words + phrases' },
    { topic: 'Meeting new people', words: 20, kind: 'phrases' },
    { topic: 'At the hotel', words: 10, kind: 'words' },
  ],
};

beforeEach(() => {
  jest.clearAllMocks();
  takePendingAsk();
  mockApi.fetchProgress.mockResolvedValue(progress);
});

test('the plan: heading with the goal, and each idea with its size', async () => {
  mockApi.fetchPlan.mockResolvedValue(plan);
  await render(<ProgressScreen />);
  await waitFor(() => expect(screen.getByText('YOUR WORD PLAN · TRAVEL')).toBeOnTheScreen());
  expect(screen.getByRole('button', { name: 'Getting around the city, 30 words · words + phrases' })).toBeOnTheScreen();
  expect(screen.getByRole('button', { name: 'Meeting new people, 20 words · phrases' })).toBeOnTheScreen();
  expect(screen.getByRole('button', { name: 'At the hotel, 10 words · words' })).toBeOnTheScreen();
});

test('tapping an idea opens the New words tab and leaves the ask for Kai', async () => {
  mockApi.fetchPlan.mockResolvedValue(plan);
  await render(<ProgressScreen />);
  await waitFor(() => expect(screen.getByText('YOUR WORD PLAN · TRAVEL')).toBeOnTheScreen());
  await fireEvent.press(screen.getByRole('button', { name: 'At the hotel, 10 words · words' }));
  expect(mockRouter.navigate).toHaveBeenCalledWith('/(tabs)');
  expect(takePendingAsk()).toBe('A deck about At the hotel');
});

test('an empty plan or a failed call: no plan section, the rest of the page shows', async () => {
  mockApi.fetchPlan.mockResolvedValue({ goal: 'travel', items: [] });
  const first = await render(<ProgressScreen />);
  await waitFor(() => expect(screen.getByText('words in your word bank')).toBeOnTheScreen());
  expect(screen.queryByText(/YOUR WORD PLAN/)).toBeNull();
  first.unmount();
  mockApi.fetchPlan.mockRejectedValue(new Error('down'));
  await render(<ProgressScreen />);
  await waitFor(() => expect(screen.getByText('words in your word bank')).toBeOnTheScreen());
  expect(screen.queryByText(/YOUR WORD PLAN/)).toBeNull();
});
