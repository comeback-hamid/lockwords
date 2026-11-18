import { act, fireEvent, render, screen, waitFor } from '@testing-library/react-native';

import type { Estimate, WordTest } from '@/api/client';
import EstimateScreen from '@/app/onboarding/estimate';
import WordTestScreen from '@/app/onboarding/word-test';
import { api } from '@/auth/boot';
import { getAnswers, resetAnswers, setAnswers } from '@/onboarding/store';

// O4–O7 with the vocabulary engine (docs/vocab-engine.md). The server owns the words, the next page and the score.
const mockRouter = { push: jest.fn(), replace: jest.fn(), back: jest.fn(), dismissTo: jest.fn(), canGoBack: () => true };
let mockParams: Record<string, string> = {};
jest.mock('expo-router', () => ({ useRouter: () => mockRouter, useLocalSearchParams: () => mockParams }));
jest.mock('@/auth/boot', () => ({ api: { fetchWordTest: jest.fn(), fetchNextPage: jest.fn(), fetchEstimate: jest.fn() } }));
jest.mock('react-native-safe-area-context', () => ({ useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }) }));

const mockApi = jest.mocked(api);
const page = (...w: string[]) => w.map((x) => ({ w: x }));
const test4: WordTest = {
  supported: true,
  madeUp: true,
  pages: { A: page('hola', 'gracias', 'el agua', 'plosca'), B: page('aunque', 'lograr'), C: page('baladí', 'ufano'), D: page('menoscabar') },
};
const result = (over: Partial<Estimate> = {}): Estimate => ({ words: 4700, outOf: 5000, plus: false, cefr: 'C1', startingFresh: false, reliable: true, fakesTicked: 0, ...over });
const continueButton = () => screen.getByRole('button', { name: 'Continue' });

beforeEach(() => {
  resetAnswers();
  setAnswers({ learning: { code: 'es', name: 'Spanish' }, level: 'some_basics' });
  mockParams = {};
  jest.clearAllMocks();
});

describe('O4–O6 Word test', () => {
  test('loading, then the first page: header, the made-up line, chips; a tap only turns the chip green', async () => {
    let answer!: (t: WordTest) => void;
    mockApi.fetchWordTest.mockReturnValue(new Promise((resolve) => (answer = resolve)));
    mockParams = { page: 'A' };
    await render(<WordTestScreen />);
    expect(screen.getByText('Loading words…')).toBeOnTheScreen();
    await act(async () => answer(test4));
    expect(mockApi.fetchWordTest).toHaveBeenCalledWith('es');
    expect(screen.getByText('BASIC WORDS')).toBeOnTheScreen();
    expect(screen.getByText('Only tap words you know the meaning of. Some are made up.')).toBeOnTheScreen();
    expect(screen.getByText('3/10')).toBeOnTheScreen();
    await fireEvent.press(screen.getByRole('checkbox', { name: 'hola' }));
    await fireEvent.press(screen.getByRole('checkbox', { name: 'plosca' }));
    expect(screen.getByRole('checkbox', { name: 'hola' }).props.accessibilityState.checked).toBe(true);
    expect(screen.getByText('2 SELECTED')).toBeOnTheScreen();
    expect(screen.queryByTestId('chip-check')).toBeNull(); // no check mark
    await fireEvent.press(continueButton());
    expect(getAnswers().known.A).toEqual(['hola', 'plosca']);
    expect(mockRouter.push).toHaveBeenCalledWith('/onboarding/word-test?page=B');
  });

  test('a typed-language test has no made-up words, so the line does not say so', async () => {
    setAnswers({ wordTest: { supported: true, madeUp: false, pages: { A: page('hej'), B: page('dock'), C: page('ändå') } } });
    mockParams = { page: 'A' };
    await render(<WordTestScreen />);
    expect(screen.getByText('Only tap words you know the meaning of.')).toBeOnTheScreen();
  });

  test('readings show under a word that has one', async () => {
    setAnswers({ wordTest: { supported: true, madeUp: true, pages: { A: [{ w: '水', rd: 'みず' }], B: [] } } });
    mockParams = { page: 'A' };
    await render(<WordTestScreen />);
    expect(screen.getByText('みず')).toBeOnTheScreen();
  });

  test('after page B the server decides: no more pages → the result', async () => {
    setAnswers({ wordTest: test4, known: { A: ['hola'], B: [] } });
    mockApi.fetchNextPage.mockResolvedValue(null);
    mockParams = { page: 'B' };
    await render(<WordTestScreen />);
    expect(screen.getByText('INTERMEDIATE WORDS')).toBeOnTheScreen();
    expect(screen.getByText('4/10')).toBeOnTheScreen();
    await fireEvent.press(screen.getByRole('checkbox', { name: 'aunque' }));
    await fireEvent.press(continueButton());
    await waitFor(() => expect(mockRouter.push).toHaveBeenCalledWith('/onboarding/estimate'));
    expect(mockApi.fetchNextPage).toHaveBeenCalledWith('es', { A: ['hola'], B: ['aunque'] });
    expect(mockApi.fetchWordTest).not.toHaveBeenCalled(); // loaded once, on page A
  });

  test('long test, page B: the server says C comes next', async () => {
    setAnswers({ wordTest: test4, known: { A: ['hola'], B: ['aunque', 'lograr'] } });
    mockApi.fetchNextPage.mockResolvedValue('C');
    mockParams = { page: 'B' };
    await render(<WordTestScreen />);
    await fireEvent.press(continueButton());
    await waitFor(() => expect(mockRouter.push).toHaveBeenCalledWith('/onboarding/word-test?page=C'));
  });

  test('long test, page C: nothing tapped still counts as answered; the server says D comes next', async () => {
    setAnswers({ wordTest: test4, known: { A: ['hola'], B: ['aunque', 'lograr'] } });
    mockApi.fetchNextPage.mockResolvedValue('D');
    mockParams = { page: 'C' };
    await render(<WordTestScreen />);
    expect(screen.getByText('ADVANCED WORDS')).toBeOnTheScreen();
    await fireEvent.press(continueButton());
    await waitFor(() => expect(mockRouter.push).toHaveBeenCalledWith('/onboarding/word-test?page=D'));
    expect(mockApi.fetchNextPage).toHaveBeenLastCalledWith('es', { A: ['hola'], B: ['aunque', 'lograr'], C: [] });
  });

  test('long test, page D: EXPERT WORDS, then the result', async () => {
    setAnswers({ wordTest: test4, known: { A: ['hola'], B: ['aunque', 'lograr'], C: ['baladí'] } });
    mockParams = { page: 'D' };
    await render(<WordTestScreen />);
    expect(screen.getByText('EXPERT WORDS')).toBeOnTheScreen();
    expect(screen.getByText('5/10')).toBeOnTheScreen(); // the rare 4th page keeps step 5
    await fireEvent.press(continueButton());
    expect(mockRouter.push).toHaveBeenLastCalledWith('/onboarding/estimate');
  });

  test('“I don’t know any of these” clears the page and continues', async () => {
    setAnswers({ wordTest: test4, known: { A: ['hola', 'gracias'], B: [] } });
    mockParams = { page: 'A' };
    await render(<WordTestScreen />);
    await fireEvent.press(screen.getByRole('button', { name: 'I don’t know any of these' }));
    expect(getAnswers().known.A).toEqual([]);
    expect(mockRouter.push).toHaveBeenCalledWith('/onboarding/word-test?page=B');
  });

  test('words below the screen: the button says “See all words ↓” until the end was on screen', async () => {
    setAnswers({ wordTest: test4 });
    mockParams = { page: 'A' };
    await render(<WordTestScreen />);
    const scroll = screen.getByTestId('question-scroll');
    await fireEvent(scroll, 'layout', { nativeEvent: { layout: { height: 300 } } });
    await fireEvent(scroll, 'contentSizeChange', 390, 900);
    expect(screen.getByRole('button', { name: 'See all words ↓' })).toBeOnTheScreen();
    await fireEvent.press(screen.getByRole('button', { name: 'See all words ↓' }));
    expect(mockRouter.push).not.toHaveBeenCalled();
    await fireEvent.scroll(scroll, { nativeEvent: { contentOffset: { y: 600 }, contentSize: { height: 900, width: 390 }, layoutMeasurement: { height: 300, width: 390 } } });
    expect(continueButton()).toBeOnTheScreen();
  });

  test('a language without a test skips to Goal', async () => {
    mockApi.fetchWordTest.mockResolvedValue({ supported: false, madeUp: false, pages: {} });
    mockParams = { page: 'A' };
    await render(<WordTestScreen />);
    await waitFor(() => expect(mockRouter.replace).toHaveBeenCalledWith('/onboarding/goal'));
  });

  test('server errors show a message and Try again', async () => {
    mockApi.fetchWordTest.mockRejectedValueOnce(new Error('down')).mockResolvedValue(test4);
    mockParams = { page: 'A' };
    await render(<WordTestScreen />);
    await fireEvent.press(await screen.findByRole('button', { name: 'Try again' }));
    expect(await screen.findByText('BASIC WORDS')).toBeOnTheScreen();
  });

  test('the next-page call fails: a message, and Continue tries again', async () => {
    setAnswers({ wordTest: test4 });
    mockApi.fetchNextPage.mockRejectedValueOnce(new Error('down')).mockResolvedValue(null);
    mockParams = { page: 'B' };
    await render(<WordTestScreen />);
    await fireEvent.press(continueButton());
    expect(await screen.findByText('Could not load the next page. Try again.')).toBeOnTheScreen();
    await fireEvent.press(continueButton());
    await waitFor(() => expect(mockRouter.push).toHaveBeenCalledWith('/onboarding/estimate'));
  });
});

describe('O7 Your estimate', () => {
  beforeEach(() => setAnswers({ wordTest: test4, known: { A: ['hola'], B: ['aunque'], C: [] } }));

  test('loading, then ≈ N counting up, the caption, “About level X” and the source line', async () => {
    let answer!: (e: Estimate) => void;
    mockApi.fetchEstimate.mockReturnValue(new Promise((resolve) => (answer = resolve)));
    await render(<EstimateScreen />);
    expect(screen.getByText('Counting…')).toBeOnTheScreen();
    expect(screen.getByText('6/10')).toBeOnTheScreen();
    expect(mockApi.fetchEstimate).toHaveBeenCalledWith('es', { A: ['hola'], B: ['aunque'], C: [] });
    await act(async () => answer(result()));
    expect(screen.getByText('YOU ALREADY KNOW')).toBeOnTheScreen();
    expect(await screen.findByText('4,700', {}, { timeout: 3000 })).toBeOnTheScreen();
    expect(screen.getByText('of the 5,000 most common\nSpanish words')).toBeOnTheScreen();
    expect(screen.getByText('About level C1')).toBeOnTheScreen();
    expect(screen.getByText('An estimate from your word test.')).toBeOnTheScreen();
    await fireEvent.press(continueButton());
    expect(getAnswers().estimate).toEqual(result());
    expect(mockRouter.push).toHaveBeenCalledWith('/onboarding/goal');
  });

  test('the top of the scale reads 5,000+', async () => {
    mockApi.fetchEstimate.mockResolvedValue(result({ words: 5000, plus: true, cefr: 'C2' }));
    await render(<EstimateScreen />);
    expect(await screen.findByText('5,000+', {}, { timeout: 3000 })).toBeOnTheScreen();
  });

  test('no real word ticked → “You’re starting fresh”, no number', async () => {
    mockApi.fetchEstimate.mockResolvedValue(result({ words: 0, cefr: 'A1', startingFresh: true }));
    await render(<EstimateScreen />);
    expect(await screen.findByText('You’re starting fresh')).toBeOnTheScreen();
    expect(screen.queryByText('YOU ALREADY KNOW')).toBeNull();
  });

  test('a made-up word was ticked → a short note', async () => {
    mockApi.fetchEstimate.mockResolvedValue(result({ words: 4200, fakesTicked: 1 }));
    await render(<EstimateScreen />);
    expect(await screen.findByText('Some words you tapped were made up, so we lowered the number a little.')).toBeOnTheScreen();
  });

  test('first unreliable result → Try again screen; Try again clears the answers and goes back to page A', async () => {
    mockApi.fetchEstimate.mockResolvedValue(result({ words: 700, cefr: 'A1', reliable: false, fakesTicked: 9 }));
    await render(<EstimateScreen />);
    expect(await screen.findByText('Were you guessing?')).toBeOnTheScreen();
    expect(screen.queryByText('YOU ALREADY KNOW')).toBeNull();
    await fireEvent.press(screen.getByRole('button', { name: 'Try again' }));
    expect(getAnswers().known).toEqual({ A: [], B: [] });
    expect(getAnswers().retried).toBe(true);
    expect(mockRouter.dismissTo).toHaveBeenCalledWith('/onboarding/word-test?page=A');
  });

  test('“Show my result” shows the number', async () => {
    mockApi.fetchEstimate.mockResolvedValue(result({ words: 700, cefr: 'A1', reliable: false, fakesTicked: 9 }));
    await render(<EstimateScreen />);
    await fireEvent.press(await screen.findByRole('button', { name: 'Show my result' }));
    expect(await screen.findByText('700', {}, { timeout: 3000 })).toBeOnTheScreen();
  });

  test('a second unreliable result shows the number at once', async () => {
    setAnswers({ retried: true });
    mockApi.fetchEstimate.mockResolvedValue(result({ words: 700, cefr: 'A1', reliable: false, fakesTicked: 9 }));
    await render(<EstimateScreen />);
    expect(await screen.findByText('700', {}, { timeout: 3000 })).toBeOnTheScreen();
    expect(screen.queryByText('Were you guessing?')).toBeNull();
  });

  test('error shows Try again', async () => {
    mockApi.fetchEstimate.mockRejectedValueOnce(new Error('down')).mockResolvedValue(result());
    await render(<EstimateScreen />);
    await fireEvent.press(await screen.findByRole('button', { name: 'Try again' }));
    expect(await screen.findByText('YOU ALREADY KNOW')).toBeOnTheScreen();
  });
});
