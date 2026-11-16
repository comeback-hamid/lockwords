import { act, fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import * as Speech from 'expo-speech';

import type { ReviewCard } from '@/api/client';
import ReviewScreen from '@/app/(tabs)/review';
import HardWordsScreen from '@/app/intro/hard-words';
import PaywallScreen from '@/app/intro/paywall';
import TrialScreen from '@/app/intro/trial';
import RoundScreen from '@/app/review/round';
import UseItScreen from '@/app/use-it/[id]';
import { api } from '@/auth/boot';
import { isIntroDone, markIntroDone } from '@/review/intro';
import { advance, getRound, setRound } from '@/review/round-store';

const mockRouter = { push: jest.fn(), replace: jest.fn(), back: jest.fn(), canGoBack: () => true };
let mockParams: Record<string, string> = {};
jest.mock('expo-router', () => ({
  Stack: { Screen: () => null },
  useRouter: () => mockRouter,
  useLocalSearchParams: () => mockParams,
  useFocusEffect: (fn: () => void) => jest.requireActual('react').useEffect(fn, [fn]),
}));
jest.mock('@/auth/boot', () => ({ api: { fetchRound: jest.fn(), swipeCard: jest.fn(), fetchHardWords: jest.fn(), useIt: jest.fn() } }));
jest.mock('@/review/intro', () => ({ isIntroDone: jest.fn(async () => true), markIntroDone: jest.fn(async () => {}) }));
jest.mock('expo-speech', () => ({ speak: jest.fn(), stop: jest.fn() }));
jest.mock('react-native-safe-area-context', () => ({ useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }) }));

const mockApi = jest.mocked(api);
const card = (i: number, word: string, translation: string): ReviewCard => ({ id: `c${i}`, deckId: 'd1', deckTopic: 'Ordering food', word, translation, example: `Deja un 10 % de ${word.replace('la ', '')}.`, exampleTranslation: 'Leave a 10% tip.', stage: 0 });
const two = [card(1, 'la propina', 'the tip'), card(2, 'la cuenta', 'the bill')];
const swiped = (over: object) => ({ id: 'c1', stage: 1, known: false, hard: false, backInDays: 1, ...over });
const kaiSays = (text: string) => screen.getByLabelText(`Kai: ${text}`);

beforeEach(() => {
  jest.clearAllMocks();
  mockParams = {};
  setRound([]);
  jest.mocked(isIntroDone).mockResolvedValue(true);
});

describe('Review tab', () => {
  test('loading, then “N cards to review today” and Let’s start opens the round', async () => {
    let answer!: (c: ReviewCard[]) => void;
    mockApi.fetchRound.mockReturnValue(new Promise((resolve) => (answer = resolve)));
    await render(<ReviewScreen />);
    expect(screen.getByText('Loading your cards…')).toBeOnTheScreen();
    await act(async () => answer(two));
    await waitFor(() => expect(screen.getByRole('header', { name: '2 cards to review today' })).toBeOnTheScreen());
    await fireEvent.press(screen.getByRole('button', { name: 'Let’s start' }));
    expect(getRound().cards).toEqual(two);
    expect(mockRouter.push).toHaveBeenCalledWith('/review/round');
  });

  test('one card is singular', async () => {
    mockApi.fetchRound.mockResolvedValue([two[0]!]);
    await render(<ReviewScreen />);
    await waitFor(() => expect(screen.getByRole('header', { name: '1 card to review today' })).toBeOnTheScreen());
  });

  test('nothing to review → All done for today, no start button', async () => {
    mockApi.fetchRound.mockResolvedValue([]);
    await render(<ReviewScreen />);
    await waitFor(() => expect(screen.getByRole('header', { name: 'All done for today' })).toBeOnTheScreen());
    expect(screen.queryByRole('button', { name: 'Let’s start' })).toBeNull();
  });

  test('error → Try again', async () => {
    mockApi.fetchRound.mockRejectedValueOnce(new Error('down')).mockResolvedValue(two);
    await render(<ReviewScreen />);
    await waitFor(() => expect(screen.getByText('Could not load your cards.')).toBeOnTheScreen());
    await fireEvent.press(screen.getByRole('button', { name: 'Try again' }));
    await waitFor(() => expect(screen.getByRole('header', { name: '2 cards to review today' })).toBeOnTheScreen());
  });
});

describe('Card round', () => {
  beforeEach(() => setRound(two));

  test('front, flip to the back, speaker', async () => {
    await render(<RoundScreen />);
    expect(screen.getByText('2 words left')).toBeOnTheScreen();
    expect(screen.getByText('Ordering food')).toBeOnTheScreen();
    expect(screen.getByText('la propina')).toBeOnTheScreen();
    expect(screen.getByText('TAP TO FLIP')).toBeOnTheScreen();
    expect(screen.queryByText('the tip')).toBeNull();
    await fireEvent.press(screen.getByRole('button', { name: 'Say the word' }));
    expect(Speech.speak).toHaveBeenCalledWith('la propina', expect.anything());
    await fireEvent.press(screen.getByTestId('review-card'));
    expect(screen.getByText('the tip')).toBeOnTheScreen();
    expect(screen.getByLabelText('Deja un 10 % de propina.')).toBeOnTheScreen();
    expect(screen.getByText('Leave a 10% tip.')).toBeOnTheScreen();
    await fireEvent.press(screen.getByRole('button', { name: 'Use it' }));
    expect(mockRouter.push).toHaveBeenCalledWith('/use-it/c1');
  });

  test('EASY: sends the swipe, shows the stamp, then the next card', async () => {
    mockApi.swipeCard.mockResolvedValue(swiped({}));
    await render(<RoundScreen />);
    await fireEvent.press(screen.getByRole('button', { name: 'Easy' }));
    expect(mockApi.swipeCard).toHaveBeenCalledWith('c1', 'easy');
    await waitFor(() => expect(screen.getByText('la cuenta')).toBeOnTheScreen());
    expect(screen.getByText('1 word left')).toBeOnTheScreen();
  });

  test('stamps: EASY back in N days, HARD goes to the lock screen, KNOW IT won’t show again', async () => {
    let answer!: (r: ReturnType<typeof swiped>) => void;
    const hold = () => mockApi.swipeCard.mockReturnValueOnce(new Promise((resolve) => (answer = resolve)));
    setRound([...two, card(3, 'pedir', 'to order'), card(4, 'pagar', 'to pay')]);
    await render(<RoundScreen />);

    hold();
    await fireEvent.press(screen.getByRole('button', { name: 'Easy' }));
    await act(async () => answer(swiped({ backInDays: 3, stage: 2 })));
    expect(screen.getByTestId('stamp-title')).toHaveTextContent('EASY');
    expect(screen.getByText('BACK IN 3 DAYS')).toBeOnTheScreen();
    await waitFor(() => expect(screen.getByText('la cuenta')).toBeOnTheScreen());

    hold();
    await fireEvent.press(screen.getByRole('button', { name: 'Hard' }));
    expect(mockApi.swipeCard).toHaveBeenLastCalledWith('c2', 'hard');
    await act(async () => answer(swiped({ hard: true })));
    expect(screen.getByTestId('stamp-title')).toHaveTextContent('HARD');
    expect(screen.getByText('GOES TO YOUR LOCK SCREEN')).toBeOnTheScreen();
    await waitFor(() => expect(screen.getByText('pedir')).toBeOnTheScreen());

    hold();
    await fireEvent.press(screen.getByRole('button', { name: 'Know it' }));
    expect(mockApi.swipeCard).toHaveBeenLastCalledWith('c3', 'known');
    await act(async () => answer(swiped({ known: true, backInDays: null })));
    expect(screen.getByTestId('stamp-title')).toHaveTextContent('KNOW IT');
    expect(screen.getByText('WON’T SHOW AGAIN')).toBeOnTheScreen();
    await waitFor(() => expect(screen.getByText('pagar')).toBeOnTheScreen());
  });

  test('save fails → the card stays with a message', async () => {
    mockApi.swipeCard.mockRejectedValue(new Error('offline'));
    await render(<RoundScreen />);
    await fireEvent.press(screen.getByRole('button', { name: 'Easy' }));
    await waitFor(() => expect(screen.getByText('Could not save. Try again.')).toBeOnTheScreen());
    expect(screen.getByText('la propina')).toBeOnTheScreen();
    expect(screen.getByText('2 words left')).toBeOnTheScreen();
  });

  test('end of a later round → Review tab', async () => {
    setRound([two[0]!]);
    mockApi.swipeCard.mockResolvedValue(swiped({}));
    await render(<RoundScreen />);
    await fireEvent.press(screen.getByRole('button', { name: 'Easy' }));
    await waitFor(() => expect(mockRouter.replace).toHaveBeenCalledWith('/(tabs)/review'));
  });

  test('end of the very first round → hard words screen', async () => {
    jest.mocked(isIntroDone).mockResolvedValue(false);
    setRound([two[0]!]);
    mockApi.swipeCard.mockResolvedValue(swiped({}));
    await render(<RoundScreen />);
    await fireEvent.press(screen.getByRole('button', { name: 'Easy' }));
    await waitFor(() => expect(mockRouter.replace).toHaveBeenCalledWith('/intro/hard-words'));
  });

  test('a new card starts on its front, even when the last one was flipped (coming back from Use it)', async () => {
    await render(<RoundScreen />);
    await fireEvent.press(screen.getByTestId('review-card'));
    expect(screen.getByText('the tip')).toBeOnTheScreen();
    await act(async () => advance());
    expect(screen.getByText('la cuenta')).toBeOnTheScreen();
    expect(screen.getByText('TAP TO FLIP')).toBeOnTheScreen();
    expect(screen.queryByText('the bill')).toBeNull();
  });

  test('close leaves the round', async () => {
    await render(<RoundScreen />);
    await fireEvent.press(screen.getByRole('button', { name: 'Close' }));
    expect(mockRouter.replace).toHaveBeenCalledWith('/(tabs)/review');
  });
});

describe('Use it', () => {
  const send = async (text: string) => {
    await fireEvent.changeText(screen.getByLabelText('Message'), text);
    await fireEvent.press(screen.getByRole('button', { name: 'Send' }));
  };
  beforeEach(() => {
    setRound(two);
    mockParams = { id: 'c1' };
  });

  test('opens with the word and two options; “Show me an example” shows the example', async () => {
    await render(<UseItScreen />);
    expect(kaiSays('Time to use a word! ✍️')).toBeOnTheScreen();
    expect(screen.getByLabelText('Kai: la propina, the tip')).toBeOnTheScreen();
    expect(kaiSays('Write one sentence with la propina. I’ll check it for you.')).toBeOnTheScreen();
    await fireEvent.press(screen.getByRole('button', { name: 'Show me an example' }));
    expect(kaiSays('Deja un 10 % de propina.')).toBeOnTheScreen();
    await fireEvent.press(screen.getByRole('button', { name: 'Skip this word' }));
    expect(mockRouter.back).toHaveBeenCalled();
  });

  test('good sentence: lines, “moved up a level”, Next card moves the round on', async () => {
    let answer!: (r: Awaited<ReturnType<typeof api.useIt>>) => void;
    mockApi.useIt.mockReturnValue(new Promise((resolve) => (answer = resolve)));
    await render(<UseItScreen />);
    await send('Dejé propina al mesero.');
    expect(mockApi.useIt).toHaveBeenCalledWith('c1', 'Dejé propina al mesero.');
    expect(screen.getByLabelText('You: Dejé propina al mesero.')).toBeOnTheScreen();
    expect(kaiSays('Checking… 👀')).toBeOnTheScreen();
    await act(async () => answer({ good: true, lines: ['🎉 **Great sentence!**', '👍 You used **propina** in the right place.'], movedUp: true, stage: 1 }));
    expect(kaiSays('🎉 Great sentence!')).toBeOnTheScreen();
    expect(kaiSays('👍 You used propina in the right place.')).toBeOnTheScreen();
    expect(screen.getByText('LA PROPINA MOVED UP A LEVEL')).toBeOnTheScreen();
    expect(screen.queryByLabelText('Kai: Checking… 👀')).toBeNull();
    await fireEvent.press(screen.getByRole('button', { name: 'Next card' }));
    expect(getRound().index).toBe(1);
    expect(mockRouter.back).toHaveBeenCalled();
  });

  test('weak sentence: lines, no “moved up”, the user can write again', async () => {
    mockApi.useIt.mockResolvedValue({ good: false, lines: ['🤔 I can’t find **propina** in your sentence.'], movedUp: false, stage: 0 });
    await render(<UseItScreen />);
    await send('Me gusta el café.');
    await waitFor(() => expect(kaiSays('🤔 I can’t find propina in your sentence.')).toBeOnTheScreen());
    expect(screen.queryByText('LA PROPINA MOVED UP A LEVEL')).toBeNull();
    expect(screen.queryByRole('button', { name: 'Next card' })).toBeNull();
    expect(getRound().index).toBe(0);
  });

  test('check fails → Kai says so', async () => {
    mockApi.useIt.mockRejectedValue(new Error('502'));
    await render(<UseItScreen />);
    await send('La propina.');
    await waitFor(() => expect(kaiSays('I could not check that. Try again.')).toBeOnTheScreen());
  });
});

describe('one-time screens', () => {
  test('hard words: list from the server, Continue → trial reminder', async () => {
    mockApi.fetchHardWords.mockResolvedValue([{ word: 'la propina', translation: 'the tip' }, { word: 'pagar', translation: 'to pay' }]);
    await render(<HardWordsScreen />);
    expect(screen.getByRole('header', { name: 'Hard words go to your lock screen' })).toBeOnTheScreen();
    await waitFor(() => expect(screen.getByText('YOUR HARD WORDS · 2')).toBeOnTheScreen());
    expect(screen.getByText('pagar')).toBeOnTheScreen();
    expect(screen.getByText('to pay')).toBeOnTheScreen();
    await fireEvent.press(screen.getByRole('button', { name: 'Continue' }));
    expect(mockRouter.push).toHaveBeenCalledWith('/intro/trial');
  });

  test('hard words: no list when there are none or the server is down', async () => {
    mockApi.fetchHardWords.mockRejectedValue(new Error('down'));
    await render(<HardWordsScreen />);
    expect(screen.queryByText(/YOUR HARD WORDS/)).toBeNull();
    expect(screen.getByRole('button', { name: 'Continue' })).toBeOnTheScreen();
  });

  test('trial reminder', async () => {
    await render(<TrialScreen />);
    expect(screen.getByRole('header', { name: 'We’ll remind you before your trial ends' })).toBeOnTheScreen();
    for (const text of ['Full access, free', 'We email you a reminder', 'Trial ends. Cancel in 2 taps', 'No charge today.']) expect(screen.getByText(text)).toBeOnTheScreen();
    await fireEvent.press(screen.getByRole('button', { name: 'Continue' }));
    expect(mockRouter.push).toHaveBeenCalledWith('/intro/paywall');
  });

  test('paywall: plans, pick Monthly, close marks the one-time screens as seen', async () => {
    await render(<PaywallScreen />);
    expect(screen.getByRole('header', { name: 'Keep your words growing' })).toBeOnTheScreen();
    for (const text of ['LOCKWORDS PRO', 'Hard words on your lock screen', 'Your own decks from a prompt', 'Fast swipe review', 'Use it', '7 days free, then $39.99 a year', '$3.33/mo', 'SAVE 52%', '7 days free, then $6.99 a month']) expect(screen.getByText(text)).toBeOnTheScreen();
    expect(screen.getByRole('radio', { name: 'Yearly' }).props.accessibilityState.checked).toBe(true);
    await fireEvent.press(screen.getByRole('radio', { name: 'Monthly' }));
    expect(screen.getByRole('radio', { name: 'Monthly' }).props.accessibilityState.checked).toBe(true);
    expect(screen.getByRole('radio', { name: 'Yearly' }).props.accessibilityState.checked).toBe(false);
    await fireEvent.press(screen.getByRole('button', { name: 'Close' }));
    await waitFor(() => expect(mockRouter.replace).toHaveBeenCalledWith('/(tabs)'));
    expect(markIntroDone).toHaveBeenCalled();
  });

  test('paywall: the trial button also opens the app (no purchase yet)', async () => {
    await render(<PaywallScreen />);
    await fireEvent.press(screen.getByRole('button', { name: 'Start 7-day free trial' }));
    await waitFor(() => expect(mockRouter.replace).toHaveBeenCalledWith('/(tabs)'));
    expect(markIntroDone).toHaveBeenCalled();
  });
});
