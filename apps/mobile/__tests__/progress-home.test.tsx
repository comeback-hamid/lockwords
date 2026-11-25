import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react-native';
import { StyleSheet } from 'react-native';

import type { DeckSummary, Progress } from '@/api/client';
import ProgressScreen from '@/app/(tabs)/progress';
import { api } from '@/auth/boot';
import { colors, levelColors, levelNew } from '@/theme/theme';

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
  future: { by: '2027-02-23', total: 320, new: 0, learning: 110, mastered: 210, moreDecks: 9, grid: [...Array.from({ length: 210 }, () => 5), ...Array.from({ length: 60 }, () => 4), ...Array.from({ length: 35 }, () => 3), ...Array.from({ length: 15 }, () => 2)] },
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

test('loading, then the numbers: the total, new, learning and mastered; no hard words button (Hamid, 2026-11-23)', async () => {
  let answer!: (p: Progress) => void;
  mockApi.fetchProgress.mockReturnValue(new Promise((resolve) => (answer = resolve)));
  mockApi.fetchDecks.mockResolvedValue([]);
  await render(<ProgressScreen />);
  expect(screen.getByText('Loading your progress…')).toBeOnTheScreen();
  await act(async () => answer(progress()));
  await waitFor(() => expect(screen.getByText('52')).toBeOnTheScreen());
  for (const text of ['Today', 'In 3 months', 'by Feb 23', 'words in your word bank', '30 new', '18 learning', '4 mastered']) expect(screen.getByText(text)).toBeOnTheScreen();
  expect(screen.queryByText(/hard word/)).toBeNull();
});

test('the order from top to bottom: numbers, one meadow with Kai, the words map, decks (one meadow since 2026-11-25)', async () => {
  await show(progress());
  expect(screen.queryByTestId('meadow-goal')).toBeNull();
  for (const gone of ['you’ll master', /^BY /]) expect(screen.queryByText(gone)).toBeNull();
  const at = order(['progress-numbers', 'meadow-now', 'goal-grid', 'decks-title']);
  expect(at.every((i) => i >= 0)).toBe(true);
  expect([...at].sort((a, b) => a - b)).toEqual(at);
});

test('today’s meadow: the words fill one tree, then the next; no Kai in it', async () => {
  await show(progress());
  const now = screen.getByTestId('meadow-now');
  expect(screen.getByLabelText('Your meadow now: 2 trees')).toBeOnTheScreen();
  expect(now).toBeOnTheScreen();
  expect(screen.queryByTestId('kai-canvas')).toBeNull();
  expect(screen.getByText('■ = 1 word · 5 spaced reviews → mastered ✓')).toBeOnTheScreen();
});

test('no decks yet: the small meadow still has one tree', async () => {
  await show(progress({ total: 0, new: 0, learning: 0, mastered: 0, hard: 0, decks: 0, grid: [], trees: [], deckWords: [], language: '' }), []);
  expect(screen.getByLabelText('Your meadow now: 1 tree')).toBeOnTheScreen();
});

// The time switch (Hamid, 2026-11-25): the same page as it will be in 3 months at the learner's pace.
const tab = (name: RegExp) => screen.getByRole('tab', { name });

test('In 3 months: the number in green with "about", the counts, a bigger meadow with Kai, a full words map, the same decks', async () => {
  await show(progress());
  expect(tab(/^Today/).props.accessibilityState).toMatchObject({ selected: true });
  await fireEvent.press(tab(/^In 3 months, by Feb 23/));
  expect(tab(/^In 3 months/).props.accessibilityState).toMatchObject({ selected: true });
  expect(screen.getByText('320')).toBeOnTheScreen();
  expect(StyleSheet.flatten(screen.getByText('320').props.style).color).toBe(colors.greenText);
  expect(StyleSheet.flatten(screen.getByText('ABOUT, AT YOUR PACE').props.style).opacity).not.toBe(0);
  for (const text of ['0 new', '110 learning', '210 mastered', 'and about 9 more decks by then']) expect(screen.getByText(text)).toBeOnTheScreen();
  expect(screen.getByLabelText('Your meadow in 3 months: 10 trees')).toBeOnTheScreen();
  expect(screen.queryByTestId('meadow-now')).toBeNull();
  expect(within(screen.getByTestId('meadow-future')).queryByTestId('kai-canvas')).toBeNull();
  expect(screen.getAllByTestId('grid-level')).toHaveLength(320);
  expect(screen.queryAllByTestId('grid-empty')).toHaveLength(0);
  expect(screen.getByRole('button', { name: /^Ordering food/ })).toBeOnTheScreen(); // today's decks stay
  await fireEvent.press(tab(/^Today/));
  expect(screen.getByText('52')).toBeOnTheScreen();
  expect(screen.queryByText(/more decks by then/)).toBeNull();
  expect(StyleSheet.flatten(screen.getByText('ABOUT, AT YOUR PACE').props.style).opacity).toBe(0);
});

test('the chosen part of the switch is a white pill with bold text, in the app’s own colors (no yellow)', async () => {
  await show(progress());
  expect(StyleSheet.flatten(tab(/^Today/).props.style)).toMatchObject({ backgroundColor: colors.surface, borderColor: colors.line });
  await fireEvent.press(tab(/^In 3 months/));
  expect(StyleSheet.flatten(tab(/^Today/).props.style).backgroundColor).not.toBe(colors.surface);
  expect(StyleSheet.flatten(tab(/^In 3 months/).props.style).backgroundColor).toBe(colors.surface);
});

test('the legend: new in the lightest green, four greens for learning, a tick on mastered, and no numbers', async () => {
  await show(progress());
  const color = (level: number) => StyleSheet.flatten(screen.getByTestId(`legend-${level}`).props.style).backgroundColor;
  expect(color(0)).toBe(levelNew);
  expect([1, 2, 3, 4, 5].map(color)).toEqual([1, 2, 3, 4, 5].map((l) => levelColors[l]));
  expect(within(screen.getByTestId('legend-5')).getByText('✓')).toBeOnTheScreen();
  for (const level of [0, 1, 2, 3, 4]) expect(within(screen.getByTestId(`legend-${level}`)).queryByText(/./)).toBeNull();
});

test('the words map: a mastered word has a tick, a new word is in the lightest green', async () => {
  await show(progress());
  await fireEvent(screen.getByTestId('goal-grid'), 'layout', { nativeEvent: { layout: { width: 353, height: 100 } } });
  await waitFor(() => expect(screen.getAllByTestId('grid-tick')).toHaveLength(4));
  const colorsOf = screen.getAllByTestId('grid-level').map((sq) => StyleSheet.flatten(sq.props.style).backgroundColor);
  expect(colorsOf.filter((c) => c === levelNew)).toHaveLength(30);
});

test('the grid: one square per word of the goal; squares of words that have not come yet are grey, not black', async () => {
  await show(progress());
  expect(screen.getAllByTestId('grid-level')).toHaveLength(52);
  const empty = screen.getAllByTestId('grid-empty');
  expect(empty).toHaveLength(48);
  for (const square of empty) expect(StyleSheet.flatten(square.props.style).backgroundColor).toBe(colors.divider);
  expect(screen.getByLabelText('52 of 100 words')).toBeOnTheScreen();
});

test('the decks at the bottom: a title with the number of decks, and every deck as a short row that opens its words', async () => {
  await show(progress());
  expect(screen.getByText('You have 2 decks')).toBeOnTheScreen();
  expect(screen.getByText('20 words · 8 learning')).toBeOnTheScreen();
  expect(screen.getByText('4 words · all new')).toBeOnTheScreen();
  expect(screen.getAllByTestId('level-square')).toHaveLength(8);
  // The big deck card of the chat is not used here.
  expect(screen.queryByRole('button', { name: /Open deck/ })).toBeNull();
  expect(screen.queryByText(/ADDED TO YOUR DECKS|JUST NOW/)).toBeNull();
  await fireEvent.press(screen.getByRole('button', { name: 'Random Words 1, 4 words · all new' }));
  expect(mockRouter.push).toHaveBeenCalledWith('/deck/d2');
  await fireEvent.press(screen.getByRole('button', { name: 'Ordering food, 20 words · 8 learning' }));
  expect(mockRouter.push).toHaveBeenCalledWith('/deck/d1');
});

test('the number in the decks title is green; a deck with one word is singular', async () => {
  await show(progress({ decks: 1 }), [deck({ words: 1, learning: 1, stages: [2] })]);
  expect(StyleSheet.flatten(screen.getByTestId('decks-count').props.style).color).toBe(colors.greenText);
  expect(screen.getByText('1 word · 1 learning')).toBeOnTheScreen();
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
  await waitFor(() => expect(screen.getByRole('button', { name: 'Ordering food, 20 words · 8 learning' })).toBeOnTheScreen());
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

