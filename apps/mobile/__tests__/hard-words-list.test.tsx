import { act, fireEvent, render, screen, waitFor } from '@testing-library/react-native';

import type { HardWord } from '@/api/client';
import HardWordsScreen from '@/app/hard-words';
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

describe('Hard words (opened from Progress)', () => {
  test('loading, then every hard word with its translation and the count', async () => {
    let answer!: (w: HardWord[]) => void;
    mockApi.fetchHardWords.mockReturnValue(new Promise((resolve) => (answer = resolve)));
    await render(<HardWordsScreen />);
    expect(screen.getByText('Loading your hard words…')).toBeOnTheScreen();
    await act(async () => answer(words));
    await waitFor(() => expect(screen.getByRole('header', { name: 'Hard words' })).toBeOnTheScreen());
    expect(screen.getByText('3 WORDS · ON YOUR LOCK SCREEN')).toBeOnTheScreen();
    for (const w of words) expect(screen.getByLabelText(`${w.word}, ${w.translation}`)).toBeOnTheScreen();
  });

  test('more than five words: all of them show', async () => {
    mockApi.fetchHardWords.mockResolvedValue(Array.from({ length: 12 }, (_, i) => ({ word: `w${i}`, translation: `t${i}` })));
    await render(<HardWordsScreen />);
    await waitFor(() => expect(screen.getByText('12 WORDS · ON YOUR LOCK SCREEN')).toBeOnTheScreen());
    expect(screen.getByLabelText('w11, t11')).toBeOnTheScreen();
  });

  test('one word is singular; Back goes back', async () => {
    mockApi.fetchHardWords.mockResolvedValue(words.slice(0, 1));
    await render(<HardWordsScreen />);
    await waitFor(() => expect(screen.getByText('1 WORD · ON YOUR LOCK SCREEN')).toBeOnTheScreen());
    await fireEvent.press(screen.getByRole('button', { name: 'Back' }));
    expect(mockRouter.back).toHaveBeenCalled();
  });

  test('no hard words: says how a word gets here', async () => {
    mockApi.fetchHardWords.mockResolvedValue([]);
    await render(<HardWordsScreen />);
    await waitFor(() => expect(screen.getByText('No hard words.')).toBeOnTheScreen());
    expect(screen.getByText('Swipe a word left in Review and it shows here.')).toBeOnTheScreen();
  });

  test('error, then Try again', async () => {
    mockApi.fetchHardWords.mockRejectedValueOnce(new Error('down')).mockResolvedValue(words);
    await render(<HardWordsScreen />);
    await waitFor(() => expect(screen.getByText('Could not load your hard words.')).toBeOnTheScreen());
    await fireEvent.press(screen.getByRole('button', { name: 'Try again' }));
    await waitFor(() => expect(screen.getByText('3 WORDS · ON YOUR LOCK SCREEN')).toBeOnTheScreen());
  });
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
