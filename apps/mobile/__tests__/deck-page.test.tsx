import { act, fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import { Alert } from 'react-native';

import type { Deck } from '@/api/client';
import DeckScreen from '@/app/deck/[id]';
import { api } from '@/auth/boot';

let mockCanGoBack = true;
const mockRouter = { push: jest.fn(), replace: jest.fn(), back: jest.fn(), canGoBack: () => mockCanGoBack };
jest.mock('expo-router', () => ({ useRouter: () => mockRouter, useLocalSearchParams: () => ({ id: 'd1' }) }));
jest.mock('@/auth/boot', () => ({ api: { fetchDeck: jest.fn(), removeCard: jest.fn(), removeDeck: jest.fn() } }));
jest.mock('react-native-safe-area-context', () => ({ useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }) }));

const mockApi = jest.mocked(api);
const words: [string, string][] = [['la carta', 'the menu'], ['la cuenta', 'the bill'], ['la propina', 'the tip']];
const deck = (n = 3): Deck => ({
  id: 'd1',
  topic: 'Ordering food',
  title: 'Pedir comida',
  titleTranslation: null,
  reason: 'For your trip',
  cefr: 'A2',
  kind: 'topic',
  wordCount: n,
  status: 'ready',
  cards: words.slice(0, n).map(([word, translation], i) => ({ id: `c${i}`, position: i, word, translation, example: 'e', exampleTranslation: 'e', stage: i })),
});
const loaded = async (d = deck()) => {
  mockApi.fetchDeck.mockResolvedValue(d);
  await render(<DeckScreen />);
  await waitFor(() => expect(screen.getByRole('header', { name: 'Ordering food' })).toBeOnTheScreen());
};
const row = (word: string) => screen.getByLabelText(new RegExp(`^${word},`));
// The system pop-up: what it asked, and a tap on one of its buttons.
const alertSpy = jest.spyOn(Alert, 'alert').mockImplementation(() => {});
const tapAlert = async (label: string) => {
  const buttons = alertSpy.mock.calls.at(-1)![2]!;
  await act(async () => buttons.find((b) => b.text === label)!.onPress?.());
};

beforeEach(() => {
  jest.clearAllMocks();
  mockCanGoBack = true;
  mockApi.removeCard.mockResolvedValue(undefined);
  mockApi.removeDeck.mockResolvedValue(undefined);
});

describe('Deck page', () => {
  test('loading, then the words with the count and the hint; no Remove deck before the deck is there', async () => {
    let answer!: (d: Deck) => void;
    mockApi.fetchDeck.mockReturnValue(new Promise((resolve) => (answer = resolve)));
    await render(<DeckScreen />);
    expect(screen.getByText('Loading words…')).toBeOnTheScreen();
    expect(screen.queryByRole('button', { name: 'Remove deck' })).toBeNull();
    await act(async () => answer(deck()));
    expect(mockApi.fetchDeck).toHaveBeenCalledWith('d1');
    expect(screen.getByText('A2 · 3 WORDS')).toBeOnTheScreen();
    expect(screen.getByText('Swipe left on a word to remove it')).toBeOnTheScreen();
    expect(screen.getByText('la cuenta')).toBeOnTheScreen();
    expect(screen.getByText('the bill')).toBeOnTheScreen();
    expect(screen.getByRole('button', { name: 'Remove deck' })).toBeOnTheScreen();
  });

  test('error: a message and Try again loads once more', async () => {
    mockApi.fetchDeck.mockRejectedValueOnce(new Error('no'));
    await render(<DeckScreen />);
    await waitFor(() => expect(screen.getByText('Could not load the deck.')).toBeOnTheScreen());
    expect(screen.queryByRole('button', { name: 'Remove deck' })).toBeNull();
    mockApi.fetchDeck.mockResolvedValue(deck());
    await fireEvent.press(screen.getByRole('button', { name: 'Try again' }));
    await waitFor(() => expect(screen.getByText('la carta')).toBeOnTheScreen());
  });

  test('the Delete action of a row removes the word at once, the count follows, the server is told', async () => {
    await loaded();
    await fireEvent(row('la cuenta'), 'accessibilityAction', { nativeEvent: { actionName: 'delete' } });
    expect(screen.queryByText('la cuenta')).toBeNull();
    expect(screen.getByText('A2 · 2 WORDS')).toBeOnTheScreen();
    expect(screen.getByText('la carta')).toBeOnTheScreen();
    expect(mockApi.removeCard).toHaveBeenCalledTimes(1);
    expect(mockApi.removeCard).toHaveBeenCalledWith('c1');
  });

  test('the red Delete button is hidden until the row is swiped open, and removes the word', async () => {
    await loaded();
    expect(screen.queryByRole('button', { name: 'Delete la propina' })).toBeNull();
    await fireEvent.press(screen.getByRole('button', { name: 'Delete la propina', includeHiddenElements: true }));
    expect(screen.queryByText('la propina')).toBeNull();
    expect(mockApi.removeCard).toHaveBeenCalledWith('c2');
    expect(screen.getByText('A2 · 2 WORDS')).toBeOnTheScreen();
  });

  test('one word left reads "1 WORD"; the last word gone shows the empty line and no hint', async () => {
    await loaded(deck(2));
    await fireEvent(row('la carta'), 'accessibilityAction', { nativeEvent: { actionName: 'delete' } });
    expect(screen.getByText('A2 · 1 WORD')).toBeOnTheScreen();
    await fireEvent(row('la cuenta'), 'accessibilityAction', { nativeEvent: { actionName: 'delete' } });
    expect(screen.getByText('A2 · 0 WORDS')).toBeOnTheScreen();
    expect(screen.getByText('No words in this deck.')).toBeOnTheScreen();
    expect(screen.queryByText('Swipe left on a word to remove it')).toBeNull();
    expect(screen.getByRole('button', { name: 'Remove deck' })).toBeOnTheScreen();
  });

  test('the server fails: the word is back in its place and the page says so', async () => {
    let fail!: (e: Error) => void;
    mockApi.removeCard.mockReturnValue(new Promise((_resolve, reject) => (fail = reject)));
    await loaded();
    await fireEvent(row('la cuenta'), 'accessibilityAction', { nativeEvent: { actionName: 'delete' } });
    expect(screen.queryByText('la cuenta')).toBeNull();
    await act(async () => fail(new Error('no')));
    expect(screen.getByText('Could not remove the word.')).toBeOnTheScreen();
    expect(screen.getByText('A2 · 3 WORDS')).toBeOnTheScreen();
    expect(screen.getAllByLabelText(/^la /).map((r) => r.props.accessibilityLabel)).toEqual(['la carta, the menu', 'la cuenta, the bill', 'la propina, the tip']);
    // The next removal that works takes the message away.
    mockApi.removeCard.mockResolvedValue(undefined);
    await fireEvent(row('la carta'), 'accessibilityAction', { nativeEvent: { actionName: 'delete' } });
    expect(screen.queryByText('Could not remove the word.')).toBeNull();
  });

  test('Remove deck asks first; Cancel removes nothing', async () => {
    await loaded();
    await fireEvent.press(screen.getByRole('button', { name: 'Remove deck' }));
    expect(alertSpy).toHaveBeenCalledTimes(1);
    const [title, message, buttons] = alertSpy.mock.calls[0]!;
    expect(title).toBe('Remove this deck?');
    expect(message).toBe('Its 3 words leave Review. This cannot be undone.');
    expect(buttons!.map((b) => [b.text, b.style])).toEqual([['Cancel', 'cancel'], ['Remove', 'destructive']]);
    await tapAlert('Cancel');
    expect(mockApi.removeDeck).not.toHaveBeenCalled();
    expect(mockRouter.back).not.toHaveBeenCalled();
    expect(screen.getByText('la carta')).toBeOnTheScreen();
  });

  test('Remove: the server is told, then the app goes back', async () => {
    await loaded();
    await fireEvent.press(screen.getByRole('button', { name: 'Remove deck' }));
    await tapAlert('Remove');
    expect(mockApi.removeDeck).toHaveBeenCalledWith('d1');
    await waitFor(() => expect(mockRouter.back).toHaveBeenCalledTimes(1));
    expect(mockRouter.replace).not.toHaveBeenCalled();
  });

  test('Remove with nothing to go back to opens the tabs', async () => {
    mockCanGoBack = false;
    await loaded();
    await fireEvent.press(screen.getByRole('button', { name: 'Remove deck' }));
    await tapAlert('Remove');
    await waitFor(() => expect(mockRouter.replace).toHaveBeenCalledWith('/(tabs)'));
    expect(mockRouter.back).not.toHaveBeenCalled();
  });

  test('Remove fails: the page stays and says so; while it runs a second tap does nothing', async () => {
    let fail!: (e: Error) => void;
    mockApi.removeDeck.mockReturnValue(new Promise((_resolve, reject) => (fail = reject)));
    await loaded();
    await fireEvent.press(screen.getByRole('button', { name: 'Remove deck' }));
    await tapAlert('Remove');
    await fireEvent.press(screen.getByRole('button', { name: 'Remove deck' }));
    expect(alertSpy).toHaveBeenCalledTimes(1);
    await act(async () => fail(new Error('no')));
    expect(screen.getByText('Could not remove the deck.')).toBeOnTheScreen();
    expect(mockRouter.back).not.toHaveBeenCalled();
    expect(screen.getByText('la carta')).toBeOnTheScreen();
  });

  test('a deck with one word asks about "1 word"', async () => {
    await loaded(deck(1));
    await fireEvent.press(screen.getByRole('button', { name: 'Remove deck' }));
    expect(alertSpy.mock.calls[0]![1]).toBe('Its 1 word leaves Review. This cannot be undone.');
  });
});
