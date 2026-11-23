import { act, fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import { StyleSheet } from 'react-native';

import type { DeckSummary, Progress } from '@/api/client';
import ProgressScreen from '@/app/(tabs)/progress';
import { api } from '@/auth/boot';
import { colors } from '@/theme/theme';

const mockRouter = { push: jest.fn(), navigate: jest.fn() };
jest.mock('expo-router', () => ({ useRouter: () => mockRouter, useFocusEffect: (fn: () => void) => jest.requireActual('react').useEffect(fn, [fn]) }));
jest.mock('@/auth/boot', () => ({ api: { fetchProgress: jest.fn(), fetchDecks: jest.fn() } }));
jest.mock('react-native-safe-area-context', () => ({ useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }) }));

const mockApi = jest.mocked(api);
const progress = (over: Partial<Progress> = {}): Progress => ({
  total: 52, new: 30, learning: 18, mastered: 4, hard: 3, decks: 2, goal: 100, masterBy: '2026-12-29', language: 'Spanish',
  grid: [...Array.from({ length: 4 }, () => 5), ...Array.from({ length: 18 }, () => 2), ...Array.from({ length: 30 }, () => 0)],
  trees: [[5, 5, 5, 5, 2, 2, 2, 2, 2, 2, 2, 2], []],
  deckWords: [20, 10],
  ...over,
});
const deck = (over: Partial<DeckSummary> = {}): DeckSummary => ({ id: 'd1', topic: 'Ordering food', title: 'Order food, pay and tip', cefr: 'A2', kind: 'topic', words: 20, learning: 8, hard: 2, stages: [5, 2, 2, 0], ...over });
const show = async (p: Progress, decks: DeckSummary[] = [deck(), deck({ id: 'd2', topic: 'Random Words 1', title: 'Random Words 1', kind: 'random', words: 4, learning: 0, hard: 0, stages: [0, 0, 0, 0] })]) => {
  mockApi.fetchProgress.mockResolvedValue(p);
  mockApi.fetchDecks.mockResolvedValue(decks);
  await render(<ProgressScreen />);
  await waitFor(() => expect(screen.getByText(p.total === 1 ? 'word in your word bank' : 'words in your word bank')).toBeOnTheScreen());
  await waitFor(() => expect(screen.getByTestId('decks-title')).toBeOnTheScreen());
};
// The order of the page's parts from top to bottom, read from the rendered tree.
const order = (ids: string[]) => {
  const json = JSON.stringify(screen.toJSON());
  return ids.map((id) => json.indexOf(`"testID":"${id}"`));
};

beforeEach(() => jest.clearAllMocks());

test('loading, then the numbers: the total, new, learning, mastered and the hard words', async () => {
  let answer!: (p: Progress) => void;
  mockApi.fetchProgress.mockReturnValue(new Promise((resolve) => (answer = resolve)));
  mockApi.fetchDecks.mockResolvedValue([]);
  await render(<ProgressScreen />);
  expect(screen.getByText('Loading your progress…')).toBeOnTheScreen();
  await act(async () => answer(progress()));
  await waitFor(() => expect(screen.getByText('52')).toBeOnTheScreen());
  for (const text of ['words in your word bank', '30 new', '18 learning', '4 mastered', 'BY DEC 29', 'you’ll master', '100', 'new Spanish words']) expect(screen.getByText(text)).toBeOnTheScreen();
  expect(screen.getByRole('button', { name: '3 hard words' })).toBeOnTheScreen();
});

test('the hard words number opens the hard words list; one word is singular; zero still shows', async () => {
  await show(progress({ hard: 1, total: 1 }));
  await fireEvent.press(screen.getByRole('button', { name: '1 hard word' }));
  expect(mockRouter.push).toHaveBeenCalledWith('/hard-words');
  await screen.unmount();
  await show(progress({ hard: 0 }));
  expect(screen.getByRole('button', { name: '0 hard words' })).toBeOnTheScreen();
});

test('the order from top to bottom: numbers, small meadow with Kai, squares, big meadow, decks', async () => {
  await show(progress());
  const at = order(['progress-numbers', 'meadow-now', 'goal-grid', 'meadow-goal', 'decks-title']);
  expect(at.every((i) => i >= 0)).toBe(true);
  expect([...at].sort((a, b) => a - b)).toEqual(at);
});

test('the small meadow: one tree per deck with a leaf per word, and a small live Kai next to it', async () => {
  await show(progress());
  const now = screen.getByTestId('meadow-now');
  expect(screen.getByLabelText('Your meadow now: 2 trees')).toBeOnTheScreen();
  expect(now).toContainElement(screen.getByTestId('kai-canvas'));
  expect(screen.getByTestId('kai-canvas').props.state).toBe('idle');
});

test('no decks yet: the small meadow still has one tree', async () => {
  await show(progress({ total: 0, new: 0, learning: 0, mastered: 0, hard: 0, decks: 0, grid: [], trees: [], deckWords: [], language: '' }), []);
  expect(screen.getByLabelText('Your meadow now: 1 tree')).toBeOnTheScreen();
  expect(screen.getByText('new words')).toBeOnTheScreen();
});

test('the big meadow has at least three trees', async () => {
  await show(progress());
  expect(screen.getByLabelText('Your meadow at the goal: 3 trees')).toBeOnTheScreen();
});

test('the grid: one square per word of the goal; squares of words that have not come yet are grey, not black', async () => {
  await show(progress());
  expect(screen.getAllByTestId('grid-level')).toHaveLength(52);
  const empty = screen.getAllByTestId('grid-empty');
  expect(empty).toHaveLength(48);
  for (const square of empty) expect(StyleSheet.flatten(square.props.style).backgroundColor).toBe(colors.divider);
  expect(screen.getByLabelText('52 of 100 words')).toBeOnTheScreen();
});

test('the decks at the bottom: a title with the number of decks and every deck as a card that opens its words', async () => {
  await show(progress());
  expect(screen.getByText('You have 2 decks')).toBeOnTheScreen();
  expect(screen.getByText('“Order food, pay and tip”')).toBeOnTheScreen();
  expect(screen.getByText('“Random Words 1”')).toBeOnTheScreen();
  const cards = screen.getAllByRole('button', { name: /Open deck/ });
  expect(cards).toHaveLength(2);
  await fireEvent.press(cards[1]!);
  expect(mockRouter.push).toHaveBeenCalledWith('/deck/d2');
});

test('one deck is singular; no decks says so and points to New words', async () => {
  await show(progress({ decks: 1 }), [deck()]);
  expect(screen.getByText('You have 1 deck')).toBeOnTheScreen();
  await screen.unmount();
  await show(progress({ decks: 0 }), []);
  expect(screen.getByText('You have no decks yet')).toBeOnTheScreen();
  expect(screen.getByText('Ask Kai for one in New words.')).toBeOnTheScreen();
});

test('the decks cannot be loaded: a message and Try again, the rest of the page stays', async () => {
  mockApi.fetchProgress.mockResolvedValue(progress());
  mockApi.fetchDecks.mockRejectedValueOnce(new Error('down')).mockResolvedValue([deck()]);
  await render(<ProgressScreen />);
  await waitFor(() => expect(screen.getByText('Could not load your decks.')).toBeOnTheScreen());
  expect(screen.getByText('52')).toBeOnTheScreen();
  await fireEvent.press(screen.getByRole('button', { name: 'Try again' }));
  await waitFor(() => expect(screen.getByText('“Order food, pay and tip”')).toBeOnTheScreen());
});

test('the numbers cannot be loaded: a message, then Try again', async () => {
  mockApi.fetchProgress.mockRejectedValueOnce(new Error('down')).mockResolvedValue(progress());
  mockApi.fetchDecks.mockResolvedValue([]);
  await render(<ProgressScreen />);
  await waitFor(() => expect(screen.getByText('Could not load your progress.')).toBeOnTheScreen());
  await fireEvent.press(screen.getByRole('button', { name: 'Try again' }));
  await waitFor(() => expect(screen.getByText('52')).toBeOnTheScreen());
});

test('gone from the page: the "Decks" link at the top and the word plan', async () => {
  await show(progress());
  expect(screen.queryByRole('button', { name: /^\d+ Decks?$/ })).toBeNull();
  expect(screen.queryByText(/YOUR WORD PLAN/)).toBeNull();
  expect('fetchPlan' in api).toBe(false);
});

test('the date in another month', async () => {
  await show(progress({ masterBy: '2027-01-03' }));
  expect(screen.getByText('BY JAN 3')).toBeOnTheScreen();
});
