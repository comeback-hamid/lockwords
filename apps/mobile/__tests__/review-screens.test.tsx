import { act, fireEvent, render, screen, waitFor } from '@testing-library/react-native';

import type { ReviewCard, ReviewSummary } from '@/api/client';
import ReviewScreen from '@/app/(tabs)/review';
import { api } from '@/auth/boot';
import { isIntroDone } from '@/review/intro';
import { setRound } from '@/review/round-store';

const mockRouter = { push: jest.fn(), replace: jest.fn(), back: jest.fn() };
jest.mock('expo-router', () => ({
  Stack: { Screen: () => null },
  useRouter: () => mockRouter,
  useFocusEffect: (fn: () => void) => jest.requireActual('react').useEffect(fn, [fn]),
}));
jest.mock('@/auth/boot', () => ({ api: { fetchRound: jest.fn(), fetchSummary: jest.fn(), swipeCard: jest.fn(), undoSwipe: jest.fn() } }));
jest.mock('@/review/intro', () => ({ isIntroDone: jest.fn(async () => true) }));
jest.mock('@/review/streak', () => ({ streakToShow: jest.fn(async () => null) }));
jest.mock('expo-speech', () => ({ speak: jest.fn(), stop: jest.fn() }));
jest.mock('react-native-safe-area-context', () => ({ useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }) }));

const mockApi = jest.mocked(api);
const card = (i: number, word: string): ReviewCard => ({ id: `c${i}`, deckId: 'd1', deckTopic: 'Ordering food', word, translation: 't', example: 'e', exampleTranslation: 'et', stage: 0 });
const cards20 = Array.from({ length: 20 }, (_, i) => card(i, `w${i}`));
const summary = (over: Partial<ReviewSummary> = {}): ReviewSummary => ({ day: '2026-11-20', name: 'Maya', streakDays: 3, today: { words: 0, minutes: 0, easy: 0, hard: 0, known: 0, stages: [] }, ...over });

beforeEach(() => {
  jest.clearAllMocks();
  setRound([]);
  jest.mocked(isIntroDone).mockResolvedValue(true);
  mockApi.fetchSummary.mockResolvedValue(summary());
});

test('start: loading, then the count, "Hi Maya!" with the minutes, live Kai and Let’s start', async () => {
  let answer!: (c: ReviewCard[]) => void;
  mockApi.fetchRound.mockReturnValue(new Promise((resolve) => (answer = resolve)));
  await render(<ReviewScreen />);
  expect(screen.getByText('Loading your cards…')).toBeOnTheScreen();
  await act(async () => answer(cards20));
  await waitFor(() => expect(screen.getByRole('header', { name: '20 cards to review today' })).toBeOnTheScreen());
  expect(screen.getByText('Hi Maya! It takes about 5 minutes. Let’s keep your words fresh 🌱')).toBeOnTheScreen();
  expect(screen.getByTestId('kai-canvas')).toBeOnTheScreen();
  expect(screen.getByRole('button', { name: 'Let’s start' })).toBeOnTheScreen();
});

test('start without a name has no "Hi" part', async () => {
  mockApi.fetchRound.mockResolvedValue(cards20);
  mockApi.fetchSummary.mockResolvedValue(summary({ name: null }));
  await render(<ReviewScreen />);
  await waitFor(() => expect(screen.getByText('It takes about 5 minutes. Let’s keep your words fresh 🌱')).toBeOnTheScreen());
});

test('the summary failing does not block the start screen', async () => {
  mockApi.fetchRound.mockResolvedValue(cards20);
  mockApi.fetchSummary.mockRejectedValue(new Error('down'));
  await render(<ReviewScreen />);
  await waitFor(() => expect(screen.getByRole('header', { name: '20 cards to review today' })).toBeOnTheScreen());
});

test('Let’s start shows the round inside the tab (the tab bar stays); the first round ever opens full screen', async () => {
  mockApi.fetchRound.mockResolvedValue(cards20);
  await render(<ReviewScreen />);
  await waitFor(() => expect(screen.getByRole('button', { name: 'Let’s start' })).toBeOnTheScreen());
  await fireEvent.press(screen.getByRole('button', { name: 'Let’s start' }));
  await waitFor(() => expect(screen.getByText('20 words left')).toBeOnTheScreen());
  expect(mockRouter.push).not.toHaveBeenCalled();
  expect(screen.queryByRole('button', { name: 'Close' })).toBeNull();
});

test('the very first round opens full screen, with no tab bar', async () => {
  jest.mocked(isIntroDone).mockResolvedValue(false);
  mockApi.fetchRound.mockResolvedValue(cards20);
  await render(<ReviewScreen />);
  await waitFor(() => expect(screen.getByRole('button', { name: 'Let’s start' })).toBeOnTheScreen());
  await fireEvent.press(screen.getByRole('button', { name: 'Let’s start' }));
  await waitFor(() => expect(mockRouter.push).toHaveBeenCalledWith('/review/round'));
});

test('done: All cards done with words, minutes, one square per word and the three counts', async () => {
  mockApi.fetchRound.mockResolvedValue([]);
  mockApi.fetchSummary.mockResolvedValue(summary({ today: { words: 20, minutes: 9, easy: 12, hard: 5, known: 3, stages: Array.from({ length: 20 }, (_, i) => i % 6) } }));
  await render(<ReviewScreen />);
  await waitFor(() => expect(screen.getByRole('header', { name: 'All cards done' })).toBeOnTheScreen());
  expect(screen.getByText('You reviewed every word due today. New reviews will be ready tomorrow.')).toBeOnTheScreen();
  expect(screen.getByText('20 words · 9 minutes')).toBeOnTheScreen();
  expect(screen.getAllByTestId('level-square')).toHaveLength(20);
  expect(screen.getByLabelText('12 easy, 5 hard, 3 know it')).toBeOnTheScreen();
  expect(screen.queryByRole('button', { name: 'Let’s start' })).toBeNull();
});

test('done with one word in one minute is singular', async () => {
  mockApi.fetchRound.mockResolvedValue([]);
  mockApi.fetchSummary.mockResolvedValue(summary({ today: { words: 1, minutes: 1, easy: 1, hard: 0, known: 0, stages: [2] } }));
  await render(<ReviewScreen />);
  await waitFor(() => expect(screen.getByText('1 word · 1 minute')).toBeOnTheScreen());
});

test('nothing due and nothing swiped today', async () => {
  mockApi.fetchRound.mockResolvedValue([]);
  await render(<ReviewScreen />);
  await waitFor(() => expect(screen.getByRole('header', { name: 'Nothing to review today' })).toBeOnTheScreen());
  expect(screen.getByText('New words from Kai show up here.')).toBeOnTheScreen();
});

test('error: message and Try again', async () => {
  mockApi.fetchRound.mockRejectedValueOnce(new Error('down')).mockResolvedValue(cards20);
  await render(<ReviewScreen />);
  await waitFor(() => expect(screen.getByText('Could not load your cards.')).toBeOnTheScreen());
  await fireEvent.press(screen.getByRole('button', { name: 'Try again' }));
  await waitFor(() => expect(screen.getByRole('header', { name: '20 cards to review today' })).toBeOnTheScreen());
});
