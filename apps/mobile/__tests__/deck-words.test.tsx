import { fireEvent, render, screen, waitFor } from '@testing-library/react-native';

import type { Deck, ReviewCard } from '@/api/client';
import DeckScreen from '@/app/deck/[id]';
import RoundScreen from '@/app/review/round';
import { api } from '@/auth/boot';
import { isIntroDone } from '@/review/intro';
import { getRound, setRound } from '@/review/round-store';

const mockRouter = { push: jest.fn(), replace: jest.fn(), back: jest.fn(), canGoBack: () => true };
jest.mock('expo-router', () => ({ Stack: { Screen: () => null }, useRouter: () => mockRouter, useLocalSearchParams: () => ({ id: 'd1' }) }));
jest.mock('@/auth/boot', () => ({ api: { fetchDeck: jest.fn(), removeCard: jest.fn(), removeDeck: jest.fn(), restoreCard: jest.fn(), fetchRound: jest.fn() } }));
jest.mock('@/review/intro', () => ({ isIntroDone: jest.fn(async () => true) }));
jest.mock('@/review/streak', () => ({ streakToShow: jest.fn(async () => null) }));
jest.mock('expo-speech', () => ({ speak: jest.fn(), stop: jest.fn() }));
jest.mock('react-native-safe-area-context', () => ({ useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }) }));

const mockApi = jest.mocked(api);
type Card = Deck['cards'][number];
const card = (i: number, word: string, over: Partial<Card> = {}): Card => ({ id: `c${i}`, position: i, word, translation: `t${i}`, example: 'e', exampleTranslation: 'et', stage: 0, ...over });
const deck = (cards: Card[]): Deck => ({ id: 'd1', topic: 'Ordering food', title: 'Order food, pay and tip', titleTranslation: null, reason: 'r', cefr: 'A2', kind: 'topic', wordCount: cards.length, status: 'ready', cards });
const mixed = () =>
  deck([card(0, 'la carta', { stage: 5 }), card(1, 'pedir', { stage: 2 }), card(2, 'la cuenta', { stage: 1, hard: true }), card(3, 'la propina'), card(4, 'el postre'), card(5, 'pagar', { stage: 3, known: true })]);
const loaded = async (d = mixed()) => {
  mockApi.fetchDeck.mockResolvedValue(d);
  await render(<DeckScreen />);
  await waitFor(() => expect(screen.getByRole('header', { name: 'Ordering food' })).toBeOnTheScreen());
};
const listed = (word: string) => screen.queryByLabelText(new RegExp(`^${word},`)) !== null;
const reviewCard = (i: number): ReviewCard => ({ id: `c${i}`, deckId: 'd1', deckTopic: 'Ordering food', word: `w${i}`, translation: 't', example: 'e', exampleTranslation: 'et', stage: 0, canUseIt: false });

beforeEach(() => {
  jest.clearAllMocks();
  setRound([]);
  jest.mocked(isIntroDone).mockResolvedValue(true);
});

test('the counts line, the chain, and the chips with their counts; known words are only under Known', async () => {
  await loaded();
  expect(screen.getByText('A2 · 5 WORDS')).toBeOnTheScreen(); // the known word is not counted here
  expect(screen.getByText('2 LEARNING · 1 HARD')).toBeOnTheScreen();
  expect(screen.getAllByTestId('level-square')).toHaveLength(5);
  for (const chip of ['All 5', 'Hard 1', 'New 2', 'Mastered 1', 'Known 1']) expect(screen.getByRole('button', { name: chip })).toBeOnTheScreen();
  expect(['la carta', 'pedir', 'la cuenta', 'la propina', 'el postre', 'pagar'].map(listed)).toEqual([true, true, true, true, true, false]);
  expect(screen.getByLabelText('la cuenta, t2, hard word')).toBeOnTheScreen();
  expect(screen.getAllByTestId('hard-mark')).toHaveLength(1);
});

test('a chip shows only its words; an empty one says so', async () => {
  await loaded();
  await fireEvent.press(screen.getByRole('button', { name: 'Hard 1' }));
  expect(['la carta', 'la cuenta'].map(listed)).toEqual([false, true]);
  await fireEvent.press(screen.getByRole('button', { name: 'New 2' }));
  expect(['la propina', 'el postre', 'pedir'].map(listed)).toEqual([true, true, false]);
  await fireEvent.press(screen.getByRole('button', { name: 'Mastered 1' }));
  expect(['la carta', 'pedir'].map(listed)).toEqual([true, false]);
});

test('no known words: no Known chip; a chip with no words says "No words here."', async () => {
  await loaded(deck([card(0, 'la carta'), card(1, 'pedir')]));
  expect(screen.queryByRole('button', { name: /^Known/ })).toBeNull();
  await fireEvent.press(screen.getByRole('button', { name: 'Hard 0' }));
  expect(screen.getByText('No words here.')).toBeOnTheScreen();
});

test('Known lists the known words with Restore; Restore tells the server and loads the deck again', async () => {
  await loaded();
  await fireEvent.press(screen.getByRole('button', { name: 'Known 1' }));
  expect(listed('pagar')).toBe(true);
  mockApi.restoreCard.mockResolvedValue(undefined);
  const after = mixed();
  after.cards[5] = card(5, 'pagar', { stage: 3 });
  mockApi.fetchDeck.mockResolvedValue(after);
  await fireEvent.press(screen.getByRole('button', { name: 'Restore pagar' }));
  expect(mockApi.restoreCard).toHaveBeenCalledWith('c5');
  await waitFor(() => expect(screen.getByRole('button', { name: 'All 6' })).toBeOnTheScreen());
  expect(screen.queryByRole('button', { name: /^Known/ })).toBeNull();
});

test('Restore fails: the page says so and the word stays under Known', async () => {
  await loaded();
  await fireEvent.press(screen.getByRole('button', { name: 'Known 1' }));
  mockApi.restoreCard.mockRejectedValue(new Error('down'));
  await fireEvent.press(screen.getByRole('button', { name: 'Restore pagar' }));
  await waitFor(() => expect(screen.getByText('Could not restore the word.')).toBeOnTheScreen());
  expect(listed('pagar')).toBe(true);
});

test('Review this deck: loads this deck’s round and opens it', async () => {
  await loaded();
  mockApi.fetchRound.mockResolvedValue([1, 2, 3, 4, 5].map(reviewCard));
  await fireEvent.press(screen.getByRole('button', { name: 'Review this deck' }));
  await waitFor(() => expect(mockRouter.push).toHaveBeenCalledWith('/review/round'));
  expect(mockApi.fetchRound).toHaveBeenCalledWith('d1');
  expect(getRound().cards).toHaveLength(5);
});

test('Review this deck with nothing due says so', async () => {
  await loaded();
  mockApi.fetchRound.mockResolvedValue([]);
  await fireEvent.press(screen.getByRole('button', { name: 'Review this deck' }));
  await waitFor(() => expect(screen.getByText('Nothing to review in this deck today.')).toBeOnTheScreen());
  expect(mockRouter.push).not.toHaveBeenCalled();
});

test('the full-screen round has Close after the first round ever, and none in the first one', async () => {
  setRound([reviewCard(1), reviewCard(2)]);
  const first = await render(<RoundScreen />);
  await waitFor(() => expect(screen.getByRole('button', { name: 'Close' })).toBeOnTheScreen());
  await fireEvent.press(screen.getByRole('button', { name: 'Close' }));
  expect(mockRouter.back).toHaveBeenCalled();
  first.unmount();
  jest.mocked(isIntroDone).mockResolvedValue(false);
  await render(<RoundScreen />);
  await waitFor(() => expect(screen.getByText('2 words left')).toBeOnTheScreen());
  expect(screen.queryByRole('button', { name: 'Close' })).toBeNull();
});
