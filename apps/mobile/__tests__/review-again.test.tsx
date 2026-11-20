import { fireEvent, render, screen, waitFor } from '@testing-library/react-native';

import type { ReviewCard } from '@/api/client';
import RoundScreen from '@/app/review/round';
import { api } from '@/auth/boot';
import { getRound, setRound } from '@/review/round-store';

jest.mock('expo-router', () => ({ Stack: { Screen: () => null }, useRouter: () => ({ push: jest.fn(), replace: jest.fn(), back: jest.fn() }) }));
jest.mock('@/auth/boot', () => ({ api: { swipeCard: jest.fn() } }));
jest.mock('@/review/intro', () => ({ isIntroDone: jest.fn(async () => true) }));
jest.mock('expo-speech', () => ({ speak: jest.fn(), stop: jest.fn() }));
jest.mock('react-native-safe-area-context', () => ({ useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }) }));

const mockApi = jest.mocked(api);
const card = (i: number, word: string): ReviewCard => ({ id: `c${i}`, deckId: 'd1', deckTopic: 'Ordering food', word, translation: 't', example: 'e', exampleTranslation: 'et', stage: 0 });
const answer = (over: object) => ({ id: 'c1', stage: 1, known: false, hard: true, backInDays: 1, again: false, ...over });

beforeEach(() => {
  jest.clearAllMocks();
  setRound([card(1, 'la propina'), card(2, 'la cuenta')]);
});

test('a Hard card the server sends back is shown once more, at the end of the round', async () => {
  mockApi.swipeCard.mockResolvedValue(answer({ again: true }));
  await render(<RoundScreen />);
  expect(screen.getByText('2 words left')).toBeOnTheScreen();
  await fireEvent.press(screen.getByRole('button', { name: 'Hard' }));
  // One card done, one added: still 2 left, and the hard card is last.
  await waitFor(() => expect(screen.getByText('la cuenta')).toBeOnTheScreen(), { timeout: 3000 });
  expect(screen.getByText('2 words left')).toBeOnTheScreen();
  expect(getRound().cards.map((c) => c.word)).toEqual(['la propina', 'la cuenta', 'la propina']);
});

test('without `again` the round just moves on', async () => {
  mockApi.swipeCard.mockResolvedValue(answer({ again: false }));
  await render(<RoundScreen />);
  await fireEvent.press(screen.getByRole('button', { name: 'Hard' }));
  await waitFor(() => expect(screen.getByText('1 word left')).toBeOnTheScreen(), { timeout: 3000 });
  expect(getRound().cards).toHaveLength(2);
});
