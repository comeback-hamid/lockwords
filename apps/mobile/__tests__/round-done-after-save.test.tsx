import { act, fireEvent, render, screen, waitFor } from '@testing-library/react-native';

import type { ReviewCard, SwipeResult } from '@/api/client';
import RoundScreen from '@/app/review/round';
import { api } from '@/auth/boot';
import { setRound, swiped } from '@/review/round-store';
import { resetReviewRules } from '@/review/rules';
import { resetSaves, saveSwipe } from '@/review/saver';

// Found by the Maestro run on Android, 2026-11-25 (word-card): after the last swipe the Review tab showed
// "1 card due today" again instead of "All cards done". The round said "done" one moment before the last swipe
// counted as "being saved" (the card's place changes at once, the count a moment later), so the tab asked the server
// too early and got the old round. The round now asks the saver itself: it is done when every swipe is saved.
jest.mock('expo-router', () => ({ Stack: { Screen: () => null }, useRouter: () => ({ push: jest.fn(), replace: jest.fn(), back: jest.fn() }) }));
jest.mock('@/auth/boot', () => ({ api: { swipeCard: jest.fn(), undoSwipe: jest.fn(), fetchReviewRules: jest.fn() } }));
jest.mock('@/review/intro', () => ({ isIntroDone: jest.fn(async () => true) }));
jest.mock('@/review/streak', () => ({ streakToShow: jest.fn(async () => null) }));
jest.mock('expo-speech', () => ({ speak: jest.fn(), stop: jest.fn() }));
jest.mock('react-native-safe-area-context', () => ({ useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }) }));

const mockApi = jest.mocked(api);
const one: ReviewCard = { id: 'c1', deckId: 'd1', deckTopic: 'Ordering food', word: 'la propina', translation: 'the tip', example: 'e', exampleTranslation: 'et', stage: 0, canUseIt: true };
const saved: SwipeResult = { id: 'c1', stage: 2, known: false, hard: false, backInDays: 3, again: false };

beforeEach(() => {
  jest.clearAllMocks();
  resetReviewRules();
  resetSaves();
  mockApi.fetchReviewRules.mockResolvedValue({ easyBackInDays: [3, 3, 7, 14, 30, 30] });
  setRound([one]);
});

test('the last swipe is still being saved: the round is not done yet; it is done once, when the save is in', async () => {
  let answer!: (r: SwipeResult) => void;
  mockApi.swipeCard.mockReturnValue(new Promise((resolve) => (answer = resolve)));
  const onDone = jest.fn();
  await render(<RoundScreen inTab onDone={onDone} />);
  await fireEvent.press(screen.getByRole('button', { name: 'Easy' }));
  expect(onDone).not.toHaveBeenCalled();
  await act(async () => answer(saved));
  await waitFor(() => expect(onDone).toHaveBeenCalledTimes(1));
});

test('the card’s place changes before the round counts the save: still not done until the saver says so', async () => {
  // What the phone does on a swipe, step by step: the save starts and the card leaves, and only then (a moment
  // later on the phone) the round's own count of open saves goes up.
  let answer!: (r: SwipeResult) => void;
  mockApi.swipeCard.mockReturnValue(new Promise((resolve) => (answer = resolve)));
  const onDone = jest.fn();
  await render(<RoundScreen inTab onDone={onDone} />);
  let save!: Promise<unknown>;
  await act(async () => {
    save = saveSwipe('c1', 'easy');
    swiped();
  });
  expect(onDone).not.toHaveBeenCalled();
  await act(async () => {
    answer(saved);
    await save;
  });
  await waitFor(() => expect(onDone).toHaveBeenCalledTimes(1));
});
