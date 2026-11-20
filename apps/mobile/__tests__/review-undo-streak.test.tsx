import { fireEvent, render, screen, waitFor } from '@testing-library/react-native';

import type { ReviewCard } from '@/api/client';
import RoundScreen from '@/app/review/round';
import { api } from '@/auth/boot';
import { getRound, setRound } from '@/review/round-store';
import { streakToShow } from '@/review/streak';

jest.mock('expo-router', () => ({ Stack: { Screen: () => null }, useRouter: () => ({ push: jest.fn(), replace: jest.fn(), back: jest.fn() }) }));
jest.mock('@/auth/boot', () => ({ api: { swipeCard: jest.fn(), undoSwipe: jest.fn() } }));
jest.mock('@/review/intro', () => ({ isIntroDone: jest.fn(async () => true) }));
jest.mock('@/review/streak', () => ({ streakToShow: jest.fn(async () => null) }));
jest.mock('expo-speech', () => ({ speak: jest.fn(), stop: jest.fn() }));
jest.mock('react-native-safe-area-context', () => ({ useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }) }));

const mockApi = jest.mocked(api);
const card = (i: number, word: string): ReviewCard => ({ id: `c${i}`, deckId: 'd1', deckTopic: 'Ordering food', word, translation: 't', example: 'e', exampleTranslation: 'et', stage: 0 });
const four = [card(1, 'la propina'), card(2, 'la cuenta'), card(3, 'pedir'), card(4, 'pagar')];
const answer = (over: object = {}) => ({ id: 'c1', stage: 2, known: false, hard: false, backInDays: 3, again: false, ...over });
const next = (text: string) => waitFor(() => expect(screen.getByText(text)).toBeOnTheScreen(), { timeout: 3000 });

beforeEach(() => {
  jest.clearAllMocks();
  jest.mocked(streakToShow).mockResolvedValue(null);
  setRound(four);
  mockApi.swipeCard.mockResolvedValue(answer());
});

test('no Undo before the first swipe; after a swipe Undo brings the card back', async () => {
  mockApi.undoSwipe.mockResolvedValue({ ...four[0]!, stage: 0 });
  await render(<RoundScreen />);
  expect(screen.queryByRole('button', { name: 'Undo' })).toBeNull();
  await fireEvent.press(screen.getByRole('button', { name: 'Know it' }));
  await next('3 words left');
  await fireEvent.press(screen.getByRole('button', { name: 'Undo' }));
  await next('4 words left');
  expect(screen.getByText('la propina')).toBeOnTheScreen();
  expect(screen.queryByRole('button', { name: 'Undo' })).toBeNull(); // one step only
});

test('Undo after Hard also removes the copy that was added to the end', async () => {
  mockApi.swipeCard.mockResolvedValue(answer({ stage: 1, hard: true, again: true }));
  mockApi.undoSwipe.mockResolvedValue({ ...four[0]!, stage: 0 });
  await render(<RoundScreen />);
  await fireEvent.press(screen.getByRole('button', { name: 'Hard' }));
  await next('la cuenta');
  expect(getRound().cards).toHaveLength(5);
  await fireEvent.press(screen.getByRole('button', { name: 'Undo' }));
  await next('4 words left');
  expect(getRound().cards.map((c) => c.word)).toEqual(['la propina', 'la cuenta', 'pedir', 'pagar']);
});

test('Undo refused by the server: nothing changes and the button goes away', async () => {
  mockApi.undoSwipe.mockRejectedValue(new Error('nothing_to_undo'));
  await render(<RoundScreen />);
  await fireEvent.press(screen.getByRole('button', { name: 'Easy' }));
  await next('3 words left');
  await fireEvent.press(screen.getByRole('button', { name: 'Undo' }));
  await waitFor(() => expect(screen.queryByRole('button', { name: 'Undo' })).toBeNull());
  expect(screen.getByText('3 words left')).toBeOnTheScreen();
});

test('streak card after half of the round; a tap goes on; the swipe buttons are hidden on it', async () => {
  jest.mocked(streakToShow).mockResolvedValue(13);
  await render(<RoundScreen />);
  await fireEvent.press(screen.getByRole('button', { name: 'Easy' }));
  await next('3 words left');
  expect(screen.queryByText('day streak 🔥')).toBeNull(); // not yet: 1 of 4
  await fireEvent.press(screen.getByRole('button', { name: 'Easy' }));
  await next('day streak 🔥');
  expect(screen.getByText('13')).toBeOnTheScreen();
  expect(screen.getByText('You came back 13 days in a row. Keep it going!')).toBeOnTheScreen();
  expect(screen.getByText('SWIPE TO CONTINUE')).toBeOnTheScreen();
  expect(screen.queryByRole('button', { name: 'Easy' })).toBeNull();
  expect(mockApi.swipeCard).toHaveBeenCalledTimes(2);
  await fireEvent.press(screen.getByTestId('streak-card'));
  await next('pedir');
  expect(mockApi.swipeCard).toHaveBeenCalledTimes(2); // the streak card sends nothing
});

test('no streak card when there is none to show (shown today already, or a streak of 1)', async () => {
  await render(<RoundScreen />);
  await fireEvent.press(screen.getByRole('button', { name: 'Easy' }));
  await next('3 words left');
  await fireEvent.press(screen.getByRole('button', { name: 'Easy' }));
  await next('pedir');
  expect(screen.queryByText('day streak 🔥')).toBeNull();
});

test('the speaker is on the back too, and Use it has the mic icon', async () => {
  await render(<RoundScreen />);
  await fireEvent.press(screen.getByTestId('review-card'));
  expect(screen.getByRole('button', { name: 'Say the word' })).toBeOnTheScreen();
  expect(screen.getByRole('button', { name: 'Use it' })).toBeOnTheScreen();
});
