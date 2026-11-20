import { act, fireEvent, render, screen, waitFor } from '@testing-library/react-native';

import type { DeckSummary, Progress } from '@/api/client';
import ProgressScreen from '@/app/(tabs)/progress';
import DecksScreen from '@/app/decks';
import { api } from '@/auth/boot';

const mockRouter = { push: jest.fn(), replace: jest.fn(), back: jest.fn(), canGoBack: () => true };
jest.mock('expo-router', () => ({ useRouter: () => mockRouter, useFocusEffect: (fn: () => void) => jest.requireActual('react').useEffect(fn, [fn]) }));
jest.mock('@/auth/boot', () => ({ api: { fetchDecks: jest.fn(), fetchProgress: jest.fn() } }));
jest.mock('react-native-safe-area-context', () => ({ useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }) }));

const mockApi = jest.mocked(api);
const deck = (over: Partial<DeckSummary>): DeckSummary => ({ id: 'd1', topic: 'Ordering food', title: 'Order food, pay and tip', kind: 'topic', words: 20, learning: 8, hard: 2, stages: [5, 2, 2, 0], ...over });
const progress = (over: Partial<Progress> = {}): Progress => ({ total: 52, new: 30, learning: 18, mastered: 4, decks: 5, goal: 100, masterBy: '2026-12-29', grid: [5, 2, 0], language: 'Spanish', trees: [[5, 2]], ...over });

beforeEach(() => jest.clearAllMocks());

describe('Your decks', () => {
  test('loading, then the decks with their counts and chains; a row opens the deck', async () => {
    let answer!: (d: DeckSummary[]) => void;
    mockApi.fetchDecks.mockReturnValue(new Promise((resolve) => (answer = resolve)));
    await render(<DecksScreen />);
    expect(screen.getByText('Loading your decks…')).toBeOnTheScreen();
    await act(async () => answer([deck({}), deck({ id: 'd2', topic: 'Random Words 1', kind: 'random', words: 4, learning: 0, hard: 0, stages: [0, 0, 0, 0] })]));
    await waitFor(() => expect(screen.getByRole('header', { name: 'Your decks' })).toBeOnTheScreen());
    expect(screen.getByText('2 DECKS · 24 WORDS')).toBeOnTheScreen();
    expect(screen.getByText('20 words · 8 learning')).toBeOnTheScreen();
    expect(screen.getByText('4 words · all new')).toBeOnTheScreen();
    expect(screen.getAllByTestId('level-square')).toHaveLength(8);
    await fireEvent.press(screen.getByRole('button', { name: 'Ordering food, 20 words · 8 learning' }));
    expect(mockRouter.push).toHaveBeenCalledWith('/deck/d1');
  });

  test('one deck with one word is singular', async () => {
    mockApi.fetchDecks.mockResolvedValue([deck({ words: 1, learning: 1, stages: [2] })]);
    await render(<DecksScreen />);
    await waitFor(() => expect(screen.getByText('1 DECK · 1 WORD')).toBeOnTheScreen());
    expect(screen.getByText('1 word · 1 learning')).toBeOnTheScreen();
  });

  test('"+" opens the New words tab; Back goes back', async () => {
    mockApi.fetchDecks.mockResolvedValue([deck({})]);
    await render(<DecksScreen />);
    await waitFor(() => expect(screen.getByRole('button', { name: 'New deck' })).toBeOnTheScreen());
    await fireEvent.press(screen.getByRole('button', { name: 'New deck' }));
    expect(mockRouter.replace).toHaveBeenCalledWith('/(tabs)');
    await fireEvent.press(screen.getByRole('button', { name: 'Back' }));
    expect(mockRouter.back).toHaveBeenCalled();
  });

  test('no decks', async () => {
    mockApi.fetchDecks.mockResolvedValue([]);
    await render(<DecksScreen />);
    await waitFor(() => expect(screen.getByText('No decks yet.')).toBeOnTheScreen());
    expect(screen.getByText('Ask Kai for one in New words.')).toBeOnTheScreen();
  });

  test('error, then Try again', async () => {
    mockApi.fetchDecks.mockRejectedValueOnce(new Error('down')).mockResolvedValue([deck({})]);
    await render(<DecksScreen />);
    await waitFor(() => expect(screen.getByText('Could not load your decks.')).toBeOnTheScreen());
    await fireEvent.press(screen.getByRole('button', { name: 'Try again' }));
    await waitFor(() => expect(screen.getByText('1 DECK · 20 WORDS')).toBeOnTheScreen());
  });
});

describe('Progress tab', () => {
  test('the total and the Decks button, which opens Your decks', async () => {
    let answer!: (p: Progress) => void;
    mockApi.fetchProgress.mockReturnValue(new Promise((resolve) => (answer = resolve)));
    await render(<ProgressScreen />);
    expect(screen.getByText('Loading your progress…')).toBeOnTheScreen();
    await act(async () => answer(progress()));
    await waitFor(() => expect(screen.getByText('52')).toBeOnTheScreen());
    expect(screen.getByText('words in your word bank')).toBeOnTheScreen();
    await fireEvent.press(screen.getByRole('button', { name: '5 Decks' }));
    expect(mockRouter.push).toHaveBeenCalledWith('/decks');
  });

  test('one deck and one word are singular', async () => {
    mockApi.fetchProgress.mockResolvedValue(progress({ total: 1, decks: 1 }));
    await render(<ProgressScreen />);
    await waitFor(() => expect(screen.getByRole('button', { name: '1 Deck' })).toBeOnTheScreen());
    expect(screen.getByText('word in your word bank')).toBeOnTheScreen();
  });

  test('error, then Try again', async () => {
    mockApi.fetchProgress.mockRejectedValueOnce(new Error('down')).mockResolvedValue(progress());
    await render(<ProgressScreen />);
    await waitFor(() => expect(screen.getByText('Could not load your progress.')).toBeOnTheScreen());
    await fireEvent.press(screen.getByRole('button', { name: 'Try again' }));
    await waitFor(() => expect(screen.getByText('52')).toBeOnTheScreen());
  });
});
