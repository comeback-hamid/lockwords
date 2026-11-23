import { fireEvent, render, screen, waitFor } from '@testing-library/react-native';

import type { HardWord } from '@/api/client';
import HardWordsIntro from '@/app/intro/hard-words';
import { api } from '@/auth/boot';
import { setRound } from '@/review/round-store';

const mockRouter = { push: jest.fn(), back: jest.fn() };
jest.mock('expo-router', () => ({ useRouter: () => mockRouter }));
jest.mock('@/auth/boot', () => ({ api: { fetchHardWords: jest.fn() } }));
jest.mock('react-native-safe-area-context', () => ({ useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }) }));

const mockApi = jest.mocked(api);
const words: HardWord[] = [
  { word: 'the resume', translation: 'رزومه' },
  { word: 'to hire', translation: 'استخدام کردن' },
  { word: 'the candidate', translation: 'نامزد' },
];

beforeEach(() => {
  jest.clearAllMocks();
  setRound([]);
});

test('the separate Hard words page is gone (Hamid, 2026-11-23)', () => {
  expect(() => jest.requireActual('@/app/hard-words')).toThrow();
});

describe('the one-time screen after the first round', () => {
  test('the list cannot be loaded: it says so and Try again loads it (it used to show nothing)', async () => {
    mockApi.fetchHardWords.mockRejectedValueOnce(new Error('down')).mockResolvedValue(words);
    await render(<HardWordsIntro />);
    await waitFor(() => expect(screen.getByText('Could not load your hard words.')).toBeOnTheScreen());
    await fireEvent.press(screen.getByRole('button', { name: 'Try again' }));
    await waitFor(() => expect(screen.getByText('YOUR HARD WORDS · 3')).toBeOnTheScreen());
    expect(screen.getByRole('button', { name: 'Continue' })).toBeOnTheScreen();
  });

  test('no hard words: the phone shows a word of the learner’s own round, never the Spanish sample', async () => {
    setRound([{ id: 'c1', deckId: 'd1', deckTopic: 'Job interviews', word: 'to negotiate', translation: 'مذاکره کردن', example: 'e', exampleTranslation: 'et', stage: 0, canUseIt: true }]);
    mockApi.fetchHardWords.mockResolvedValue([]);
    await render(<HardWordsIntro />);
    await waitFor(() => expect(screen.getByText('to negotiate')).toBeOnTheScreen());
    expect(screen.queryByText('la cuenta')).toBeNull();
    expect(screen.queryByText(/YOUR HARD WORDS/)).toBeNull();
  });
});
