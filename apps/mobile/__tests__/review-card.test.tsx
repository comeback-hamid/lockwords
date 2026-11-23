import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react-native';
import { StyleSheet } from 'react-native';

import type { ReviewCard, SwipeResult } from '@/api/client';
import RoundScreen from '@/app/review/round';
import { api } from '@/auth/boot';
import { getRound, setRound } from '@/review/round-store';
import { resetReviewRules } from '@/review/rules';
import { resetSaves } from '@/review/saver';
import { card as cardTokens } from '@/theme/theme';

// The word card (Figma: Flashcard, Flashcard · back, Flashcard · rules) and the swipe that does not wait for the server.
jest.mock('expo-router', () => ({ Stack: { Screen: () => null }, useRouter: () => ({ push: jest.fn(), replace: jest.fn(), back: jest.fn() }) }));
jest.mock('@/auth/boot', () => ({ api: { swipeCard: jest.fn(), undoSwipe: jest.fn(), fetchReviewRules: jest.fn() } }));
jest.mock('@/review/intro', () => ({ isIntroDone: jest.fn(async () => true) }));
jest.mock('@/review/streak', () => ({ streakToShow: jest.fn(async () => null) }));
jest.mock('expo-speech', () => ({ speak: jest.fn(), stop: jest.fn() }));
jest.mock('react-native-safe-area-context', () => ({ useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }) }));

const mockApi = jest.mocked(api);
type Card = ReviewCard & { imageUrl?: string | null };
const card = (i: number, word: string, over: Partial<Card> = {}): Card => ({ id: `c${i}`, deckId: 'd1', deckTopic: 'Ordering food', word, translation: `t${i}`, example: 'e', exampleTranslation: 'et', stage: 0, canUseIt: true, ...over });
const three = [card(1, 'la propina'), card(2, 'la cuenta'), card(3, 'pedir')];
const saved = (over: Partial<SwipeResult> = {}): SwipeResult => ({ id: 'c1', stage: 2, known: false, hard: false, backInDays: 3, again: false, ...over });
const hidden = { includeHiddenElements: true };
const front = () => screen.getByTestId('card-front');
const back = () => screen.getByTestId('card-back', hidden);
const fontSize = (node: { props: { style?: unknown } }) => (StyleSheet.flatten(node.props.style as never) as { fontSize?: number } | undefined)?.fontSize;

beforeEach(() => {
  jest.clearAllMocks();
  resetReviewRules();
  resetSaves();
  mockApi.fetchReviewRules.mockResolvedValue({ easyBackInDays: [3, 3, 7, 14, 30, 30] });
  mockApi.swipeCard.mockResolvedValue(saved());
  setRound(three);
});

describe('layout', () => {
  test('front and back both start with the picture area, the same height', async () => {
    setRound([card(1, 'la propina', { imageUrl: 'https://example.test/propina.png' })]);
    await render(<RoundScreen />);
    const pictures = [within(front()).getByTestId('card-picture'), within(back()).getByTestId('card-picture', hidden)];
    for (const picture of pictures) expect(StyleSheet.flatten(picture.props.style).height).toBe(cardTokens.pictureHeight);
    expect(JSON.stringify(within(front()).getByTestId('card-image', hidden).props.source)).toContain('https://example.test/propina.png');
    expect(within(back()).getByTestId('card-image', hidden)).toBeTruthy();
    expect(screen.queryByTestId('card-picture-placeholder', hidden)).toBeNull();
  });

  test('no picture yet: a placeholder in the same place, on both sides', async () => {
    setRound([card(1, 'la propina')]);
    await render(<RoundScreen />);
    expect(within(front()).getByTestId('card-picture-placeholder')).toBeOnTheScreen();
    expect(within(back()).getByTestId('card-picture-placeholder', hidden)).toBeTruthy();
    expect(screen.queryByTestId('card-image', hidden)).toBeNull();
  });

  test('the word is centered on both sides, with the same size', async () => {
    setRound([card(1, 'la propina')]);
    await render(<RoundScreen />);
    const words = [within(front()).getByText('la propina'), within(back()).getByText('la propina', hidden)];
    for (const word of words) {
      expect(StyleSheet.flatten(word.props.style).textAlign).toBe('center');
      expect(fontSize(word)).toBe(44);
    }
  });

  test('a long phrase gets a smaller font, on both sides, and keeps its speaker', async () => {
    const phrase = '¿Me puede traer la cuenta, por favor?';
    setRound([card(1, phrase)]);
    await render(<RoundScreen />);
    const words = [within(front()).getByText(phrase), within(back()).getByText(phrase, hidden)];
    for (const word of words) {
      expect(fontSize(word)).toBe(24);
      expect(StyleSheet.flatten(word.props.style).maxWidth).toBe(cardTokens.wordMaxWidth);
      expect(word.props.numberOfLines).toBe(3);
    }
    expect(within(front()).getByRole('button', { name: 'Say the word' })).toBeOnTheScreen();
  });

  test('the speaker on the back has a fixed place: it is not in the word row', async () => {
    setRound([card(1, 'la propina')]);
    await render(<RoundScreen />);
    const speaker = within(back()).getByRole('button', { name: 'Say the word', ...hidden });
    const style = StyleSheet.flatten(speaker.props.style);
    expect(style.position).toBe('absolute');
    expect(style.right).toBe(cardTokens.speakerInset);
    expect(style.top).toEqual(expect.any(Number));
  });
});

describe('flip', () => {
  test('a tap turns the card: the back can be read, the front is hidden; a second tap turns it again', async () => {
    await render(<RoundScreen />);
    expect(screen.getByText('TAP TO FLIP')).toBeOnTheScreen();
    expect(screen.queryByText('t1')).toBeNull(); // the back is there for the turn, but not readable yet
    await fireEvent.press(screen.getByTestId('review-card'));
    expect(screen.getByText('t1')).toBeOnTheScreen();
    expect(screen.queryByText('TAP TO FLIP')).toBeNull();
    await fireEvent.press(screen.getByTestId('review-card'));
    expect(screen.getByText('TAP TO FLIP')).toBeOnTheScreen();
    expect(screen.queryByText('t1')).toBeNull();
  });

  test('only the top card can be read: the next card waits under it', async () => {
    await render(<RoundScreen />);
    expect(screen.queryByText('la cuenta')).toBeNull();
    expect(screen.getAllByText('la cuenta', hidden).length).toBeGreaterThan(0);
  });
});

describe('swipe', () => {
  test('the next card shows at once, before the server answers', async () => {
    let answer!: (r: SwipeResult) => void;
    mockApi.swipeCard.mockReturnValue(new Promise((resolve) => (answer = resolve)));
    await render(<RoundScreen />);
    await fireEvent.press(screen.getByRole('button', { name: 'Easy' }));
    // No waiting: the save is still open.
    expect(screen.getByText('la cuenta')).toBeOnTheScreen();
    expect(screen.getByText('2 words left')).toBeOnTheScreen();
    expect(mockApi.swipeCard).toHaveBeenCalledWith('c1', 'easy');
    await act(async () => answer(saved()));
    expect(screen.getByText('la cuenta')).toBeOnTheScreen();
  });

  test('swipes are saved one after another, in order', async () => {
    const answers: ((r: SwipeResult) => void)[] = [];
    mockApi.swipeCard.mockImplementation(() => new Promise((resolve) => answers.push(resolve)));
    await render(<RoundScreen />);
    await fireEvent.press(screen.getByRole('button', { name: 'Easy' }));
    await fireEvent.press(screen.getByRole('button', { name: 'Hard' }));
    expect(screen.getByText('pedir')).toBeOnTheScreen();
    expect(mockApi.swipeCard).toHaveBeenCalledTimes(1); // the second waits for the first
    await act(async () => answers[0]!(saved()));
    await waitFor(() => expect(mockApi.swipeCard).toHaveBeenCalledTimes(2));
    expect(mockApi.swipeCard).toHaveBeenLastCalledWith('c2', 'hard');
  });

  test('the labels are on the card from the start: EASY with the server’s days, HARD, KNOW IT', async () => {
    await render(<RoundScreen />);
    await waitFor(() => expect(screen.getByText('BACK IN 3 DAYS', hidden)).toBeTruthy());
    expect(screen.getByTestId('stamp-easy', hidden)).toHaveTextContent(/EASY/);
    expect(screen.getByTestId('stamp-hard', hidden)).toHaveTextContent(/HARD/);
    expect(screen.getByText('GOES TO YOUR LOCK SCREEN', hidden)).toBeTruthy();
    expect(screen.getByTestId('stamp-known', hidden)).toHaveTextContent(/KNOW IT/);
    expect(screen.getByText('WON’T SHOW AGAIN', hidden)).toBeTruthy();
    // A screen reader does not read them: they are a picture of the swipe.
    expect(screen.queryByText('GOES TO YOUR LOCK SCREEN')).toBeNull();
  });

  test('the days on the EASY label follow the card’s level; one day is singular', async () => {
    mockApi.fetchReviewRules.mockResolvedValue({ easyBackInDays: [1, 3, 7, 14, 30, 30] });
    setRound([card(1, 'la propina', { stage: 0 }), card(2, 'la cuenta', { stage: 3 })]);
    await render(<RoundScreen />);
    await waitFor(() => expect(screen.getByText('BACK IN 1 DAY', hidden)).toBeTruthy());
    await fireEvent.press(screen.getByRole('button', { name: 'Easy' }));
    expect(screen.getByText('BACK IN 14 DAYS', hidden)).toBeTruthy();
  });

  test('the server’s numbers could not be loaded: EASY has no line under it, the round still works', async () => {
    mockApi.fetchReviewRules.mockRejectedValue(new Error('down'));
    await render(<RoundScreen />);
    expect(screen.getByTestId('stamp-easy', hidden)).toHaveTextContent('EASY');
    expect(screen.queryByText(/BACK IN/, hidden)).toBeNull();
    await fireEvent.press(screen.getByRole('button', { name: 'Easy' }));
    expect(screen.getByText('la cuenta')).toBeOnTheScreen();
  });
});

describe('saving fails', () => {
  test('one failed try is tried again quietly', async () => {
    mockApi.swipeCard.mockRejectedValueOnce(new Error('blip')).mockResolvedValue(saved());
    await render(<RoundScreen />);
    await fireEvent.press(screen.getByRole('button', { name: 'Easy' }));
    await waitFor(() => expect(mockApi.swipeCard).toHaveBeenCalledTimes(2));
    expect(screen.queryByText('Could not save. Try again.')).toBeNull();
    expect(screen.getByText('2 words left')).toBeOnTheScreen();
  });

  test('still failing: the card comes back as the next card, with a message; nothing is lost', async () => {
    mockApi.swipeCard.mockRejectedValue(new Error('offline'));
    await render(<RoundScreen />);
    await fireEvent.press(screen.getByRole('button', { name: 'Easy' }));
    expect(screen.getByText('la cuenta')).toBeOnTheScreen(); // moved on at once
    await waitFor(() => expect(screen.getByText('Could not save. Try again.')).toBeOnTheScreen());
    expect(screen.getByText('la propina')).toBeOnTheScreen();
    expect(screen.getByText('3 words left')).toBeOnTheScreen();
    expect(getRound().cards.map((c) => c.word)).toEqual(['la propina', 'la cuenta', 'pedir']);
    expect(screen.queryByRole('button', { name: 'Undo' })).toBeNull();
    // The next good swipe clears the message.
    mockApi.swipeCard.mockResolvedValue(saved());
    await fireEvent.press(screen.getByRole('button', { name: 'Easy' }));
    expect(screen.queryByText('Could not save. Try again.')).toBeNull();
  });

  test('the last card fails to save: the round does not end without it', async () => {
    const onDone = jest.fn();
    setRound([card(1, 'la propina')]);
    mockApi.swipeCard.mockRejectedValue(new Error('offline'));
    await render(<RoundScreen inTab onDone={onDone} />);
    await fireEvent.press(screen.getByRole('button', { name: 'Easy' }));
    await waitFor(() => expect(screen.getByText('Could not save. Try again.')).toBeOnTheScreen());
    expect(screen.getByText('la propina')).toBeOnTheScreen();
    expect(onDone).not.toHaveBeenCalled();
  });

  test('Undo waits for the save, so the server takes back the right swipe', async () => {
    let answer!: (r: SwipeResult) => void;
    mockApi.swipeCard.mockReturnValue(new Promise((resolve) => (answer = resolve)));
    mockApi.undoSwipe.mockResolvedValue(three[0]!);
    await render(<RoundScreen />);
    await fireEvent.press(screen.getByRole('button', { name: 'Easy' }));
    await fireEvent.press(screen.getByRole('button', { name: 'Undo' }));
    expect(mockApi.undoSwipe).not.toHaveBeenCalled();
    await act(async () => answer(saved()));
    await waitFor(() => expect(mockApi.undoSwipe).toHaveBeenCalledTimes(1));
    await waitFor(() => expect(screen.getByText('3 words left')).toBeOnTheScreen());
    expect(screen.getByText('la propina')).toBeOnTheScreen();
  });
});
