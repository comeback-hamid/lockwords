import { act, fireEvent, render, screen, waitFor } from '@testing-library/react-native';

import type { ReviewCard } from '@/api/client';
import ReviewScreen from '@/app/(tabs)/review';
import { api } from '@/auth/boot';
import { getRound, setRound } from '@/review/round-store';
import { firstFromUrl, tapped } from '@/widgets/tapped';

// A tap on the widget opens Review, inside the round, with that word as the first card (Hamid, 2026-11-25).
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
const card = (i: number, word: string, over: Partial<ReviewCard> = {}): ReviewCard => ({ id: `c${i}`, deckId: 'd1', deckTopic: 'Ordering food', word, translation: 't', example: 'e', exampleTranslation: 'et', stage: 1, canUseIt: true, ...over });
const usual = [card(1, 'el mesero'), card(2, 'la propina')];

beforeEach(() => {
  jest.clearAllMocks();
  setRound([]);
  tapped.take();
  mockApi.fetchSummary.mockResolvedValue({ day: '2026-11-25', name: null, streakDays: 0, today: { words: 0, minutes: 0, easy: 0, hard: 0, known: 0, stages: [] } });
  mockApi.fetchRound.mockImplementation(async (_deckId?: string, first?: string) => (first === 'c9' ? [card(9, 'la cuenta', { lookOnly: true }), ...usual] : first === 'c2' ? [usual[1]!, usual[0]!] : usual));
});

test('the address of a widget tap gives the word’s id', () => {
  expect(firstFromUrl('lockwords://review?first=abc-1')).toBe('abc-1');
  expect(firstFromUrl('lockwords://review')).toBeNull();
  expect(firstFromUrl('lockwords://deck/1?first=x')).toBeNull();
  expect(firstFromUrl(null)).toBeNull();
});

test('a tapped word that is due today: the round opens at once with that word on top, no start screen', async () => {
  tapped.set('c2');
  await render(<ReviewScreen />);
  await waitFor(() => expect(screen.getByText('2 words left')).toBeOnTheScreen());
  expect(mockApi.fetchRound).toHaveBeenCalledWith(undefined, 'c2');
  expect(getRound().cards.map((c) => c.id)).toEqual(['c2', 'c1']);
  expect(screen.queryByRole('button', { name: 'Let’s start' })).toBeNull();
  expect(screen.getByRole('button', { name: 'Hard' })).toBeOnTheScreen(); // a normal card
  expect(tapped.take()).toBeNull(); // used once
});

test('a tapped word that is not due today is a look card: Next, no swipe buttons, nothing saved', async () => {
  tapped.set('c9');
  await render(<ReviewScreen />);
  await waitFor(() => expect(screen.getByText('3 words left')).toBeOnTheScreen());
  expect(screen.getByRole('button', { name: 'Next' })).toBeOnTheScreen();
  expect(screen.queryByRole('button', { name: 'Hard' })).toBeNull();
  expect(screen.queryByRole('button', { name: 'Easy' })).toBeNull();
  expect(screen.queryByRole('button', { name: 'Know it' })).toBeNull();
  await fireEvent.press(screen.getByRole('button', { name: 'Next' }));
  await waitFor(() => expect(screen.getByText('2 words left')).toBeOnTheScreen());
  expect(mockApi.swipeCard).not.toHaveBeenCalled();
  expect(screen.queryByRole('button', { name: 'Undo' })).toBeNull();
  expect(screen.getByRole('button', { name: 'Hard' })).toBeOnTheScreen(); // the next card is a normal one
});

test('a tap while a round is open puts the word on top of that round', async () => {
  await render(<ReviewScreen />);
  await waitFor(() => expect(screen.getByRole('button', { name: 'Let’s start' })).toBeOnTheScreen());
  await fireEvent.press(screen.getByRole('button', { name: 'Let’s start' }));
  await waitFor(() => expect(screen.getByText('2 words left')).toBeOnTheScreen());
  await act(async () => tapped.set('c9'));
  await waitFor(() => expect(screen.getByRole('button', { name: 'Next' })).toBeOnTheScreen());
  expect(getRound().cards.map((c) => c.id)).toEqual(['c9', 'c1', 'c2']);
});

test('the round cannot be loaded after a tap: the tab’s own error shows', async () => {
  mockApi.fetchRound.mockRejectedValue(new Error('down'));
  tapped.set('c2');
  await render(<ReviewScreen />);
  await waitFor(() => expect(screen.getByText('Could not load your cards.')).toBeOnTheScreen());
});
