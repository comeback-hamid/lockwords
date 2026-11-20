import { fireEvent, render, screen, waitFor } from '@testing-library/react-native';

import type { ReviewCard } from '@/api/client';
import RoundScreen from '@/app/review/round';
import UseItScreen from '@/app/use-it/[id]';
import { api } from '@/auth/boot';
import { getRound, setRound } from '@/review/round-store';

const mockRouter = { push: jest.fn(), replace: jest.fn(), back: jest.fn() };
jest.mock('expo-router', () => ({ Stack: { Screen: () => null }, useRouter: () => mockRouter, useLocalSearchParams: () => ({ id: 'c1' }) }));
jest.mock('@/auth/boot', () => ({ api: { useIt: jest.fn(), askAboutWord: jest.fn(), swipeCard: jest.fn() } }));
jest.mock('@/review/intro', () => ({ isIntroDone: jest.fn(async () => true) }));
jest.mock('@/review/streak', () => ({ streakToShow: jest.fn(async () => null) }));
jest.mock('expo-speech', () => ({ speak: jest.fn(), stop: jest.fn() }));
jest.mock('react-native-safe-area-context', () => ({ useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }) }));

const mockApi = jest.mocked(api);
const card = (over: Partial<ReviewCard> = {}): ReviewCard => ({ id: 'c1', deckId: 'd1', deckTopic: 'Ordering food', word: 'la propina', translation: 'the tip', example: 'Deja un 10 % de propina.', exampleTranslation: 'Leave a 10% tip.', stage: 3, canUseIt: true, ...over });
const kaiSays = (text: string) => screen.getByLabelText(`Kai: ${text}`);
const send = async (text: string) => {
  await fireEvent.changeText(screen.getByLabelText('Message'), text);
  await fireEvent.press(screen.getByRole('button', { name: 'Send' }));
};
const good = { good: true, lines: ['🎉 **Great sentence!**'], movedUp: true, stage: 4, followUp: 'Why “le”?' };

beforeEach(() => {
  jest.clearAllMocks();
  setRound([card(), card({ id: 'c2', word: 'la cuenta' })]);
});

test('after a good sentence: Next card and the server’s follow-up question; the box asks about the word', async () => {
  mockApi.useIt.mockResolvedValue(good);
  await render(<UseItScreen />);
  await send('Le dejé una propina.');
  await waitFor(() => expect(kaiSays('🎉 Great sentence!')).toBeOnTheScreen());
  expect(screen.getByRole('button', { name: 'Next card' })).toBeOnTheScreen();
  expect(screen.getByRole('button', { name: 'Why “le”?' })).toBeOnTheScreen();
  expect(screen.getByPlaceholderText('Ask Kai about this word…')).toBeOnTheScreen();
});

test('tapping the follow-up asks Kai; the answer shows, Next card stays, the level does not change', async () => {
  mockApi.useIt.mockResolvedValue(good);
  mockApi.askAboutWord.mockResolvedValue({ lines: ['💡 **Le** says who gets it.'] });
  await render(<UseItScreen />);
  await send('Le dejé una propina.');
  await waitFor(() => expect(screen.getByRole('button', { name: 'Why “le”?' })).toBeOnTheScreen());
  await fireEvent.press(screen.getByRole('button', { name: 'Why “le”?' }));
  expect(mockApi.askAboutWord).toHaveBeenCalledWith('c1', 'Why “le”?', 'Le dejé una propina.');
  await waitFor(() => expect(kaiSays('💡 Le says who gets it.')).toBeOnTheScreen());
  expect(screen.getByLabelText('You: Why “le”?')).toBeOnTheScreen();
  expect(screen.getByRole('button', { name: 'Next card' })).toBeOnTheScreen();
  expect(screen.queryByRole('button', { name: 'Why “le”?' })).toBeNull(); // asked once
  expect(mockApi.useIt).toHaveBeenCalledTimes(1);
});

test('typed text after a good sentence is a question, not a new sentence', async () => {
  mockApi.useIt.mockResolvedValue(good);
  mockApi.askAboutWord.mockResolvedValue({ lines: ['💡 Yes, you can.'] });
  await render(<UseItScreen />);
  await send('Le dejé una propina.');
  await waitFor(() => expect(screen.getByRole('button', { name: 'Next card' })).toBeOnTheScreen());
  await send('Can I say “dar propina”?');
  await waitFor(() => expect(kaiSays('💡 Yes, you can.')).toBeOnTheScreen());
  expect(mockApi.useIt).toHaveBeenCalledTimes(1);
  expect(mockApi.askAboutWord).toHaveBeenCalledWith('c1', 'Can I say “dar propina”?', 'Le dejé una propina.');
});

test('a question that cannot be answered: Kai says so, Next card stays', async () => {
  mockApi.useIt.mockResolvedValue({ ...good, followUp: null });
  mockApi.askAboutWord.mockRejectedValue(new Error('502'));
  await render(<UseItScreen />);
  await send('Le dejé una propina.');
  await waitFor(() => expect(screen.getByRole('button', { name: 'Next card' })).toBeOnTheScreen());
  expect(screen.getAllByRole('button').map((b) => b.props.accessibilityLabel)).not.toContain('Why “le”?');
  await send('Why?');
  await waitFor(() => expect(kaiSays('I could not answer that. Try again.')).toBeOnTheScreen());
  expect(screen.getByRole('button', { name: 'Next card' })).toBeOnTheScreen();
});

test('a weak sentence keeps "Show me an example" and "Skip this word"', async () => {
  mockApi.useIt.mockResolvedValue({ good: false, lines: ['🤔 Try again with the word.'], movedUp: false, stage: 3, followUp: null });
  await render(<UseItScreen />);
  await send('Me gusta el café.');
  await waitFor(() => expect(kaiSays('🤔 Try again with the word.')).toBeOnTheScreen());
  expect(screen.getByRole('button', { name: 'Show me an example' })).toBeOnTheScreen();
  expect(screen.getByRole('button', { name: 'Skip this word' })).toBeOnTheScreen();
  expect(getRound().index).toBe(0);
});

test('the card back shows Use it only when the server offers it', async () => {
  setRound([card({ canUseIt: false }), card({ id: 'c2', word: 'la cuenta', canUseIt: true })]);
  mockApi.swipeCard.mockResolvedValue({ id: 'c1', stage: 2, known: false, hard: false, backInDays: 3, again: false });
  await render(<RoundScreen />);
  await fireEvent.press(screen.getByTestId('review-card'));
  expect(screen.getByText('the tip')).toBeOnTheScreen();
  expect(screen.queryByRole('button', { name: 'Use it' })).toBeNull();
  await fireEvent.press(screen.getByRole('button', { name: 'Easy' }));
  await waitFor(() => expect(screen.getByText('la cuenta')).toBeOnTheScreen(), { timeout: 3000 });
  await fireEvent.press(screen.getByTestId('review-card'));
  expect(screen.getByRole('button', { name: 'Use it' })).toBeOnTheScreen();
});
