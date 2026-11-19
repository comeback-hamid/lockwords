import { act, fireEvent, render, screen } from '@testing-library/react-native';

import type { Deck } from '@/api/client';
import KaiScreen from '@/app/onboarding/kai';
import UseItScreen from '@/app/use-it/[id]';
import { api } from '@/auth/boot';
import { setTypingForTests, typingMs } from '@/components/chat/use-kai-typing';
import { resetAnswers, setAnswers } from '@/onboarding/store';
import { setRound } from '@/review/round-store';

// Kai types: three dots for about a second before every Kai bubble, one bubble after another, in every chat.
// jest.setup.tsx turns typing off for the other tests; these tests turn it on.
const mockRouter = { push: jest.fn(), replace: jest.fn(), back: jest.fn(), canGoBack: () => true };
let mockParams: Record<string, string> = {};
jest.mock('expo-router', () => ({ useRouter: () => mockRouter, useLocalSearchParams: () => mockParams }));
jest.mock('@/auth/boot', () => ({ api: { saveChat: jest.fn(), fetchDeckIdeas: jest.fn(), proposeDeck: jest.fn(), generateDeck: jest.fn(), fetchDeck: jest.fn(), useIt: jest.fn() } }));
jest.mock('@/onboarding/finished', () => ({ markOnboardingFinished: jest.fn(async () => {}) }));
jest.mock('react-native-safe-area-context', () => ({ useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }) }));

const mockApi = jest.mocked(api);
const proposed: Deck = { id: 'd1', topic: 'Ordering food', title: 'Order food', reason: 'For your trip', cefr: 'A2', wordCount: 10, status: 'proposed', cards: [] };
const dots = () => screen.queryAllByLabelText('Kai is typing');
const kaiLines = () => screen.queryAllByLabelText(/^Kai: /);
// Step through time so React can set the next bubble's timer after each one shows.
const wait = async (ms: number) => {
  for (let left = ms; left >= 0; left -= 50) await act(async () => void jest.advanceTimersByTime(Math.min(50, left)));
};
const send = async (text: string) => {
  await fireEvent.changeText(screen.getByLabelText('Message'), text);
  await fireEvent.press(screen.getByRole('button', { name: 'Send' }));
};

beforeEach(() => {
  jest.useFakeTimers();
  setTypingForTests(true);
  resetAnswers();
  setAnswers({ learning: { code: 'es', name: 'Spanish' }, speaks: { code: 'en', name: 'English' } });
  jest.clearAllMocks();
  mockApi.saveChat.mockImplementation(async (c) => c);
  mockApi.fetchDeckIdeas.mockResolvedValue(['Ordering food']);
  mockApi.proposeDeck.mockResolvedValue(proposed);
});
afterEach(() => {
  setTypingForTests(false);
  jest.useRealTimers();
});

test('typing time: 0.8 s for a short line, never more than 1.2 s', () => {
  expect(typingMs('Hi!')).toBeGreaterThanOrEqual(800);
  expect(typingMs('Hi!')).toBeLessThan(900);
  expect(typingMs('x'.repeat(300))).toBe(1200);
  expect(typingMs('**bold** words')).toBe(typingMs('bold words')); // stars are not typed
});

test('the first line: dots, then the message in their place', async () => {
  await render(<KaiScreen />);
  expect(dots()).toHaveLength(1);
  expect(kaiLines()).toHaveLength(0);
  await wait(typingMs('Hi! I’m Kai 👋'));
  expect(screen.getByLabelText('Kai: Hi! I’m Kai 👋')).toBeOnTheScreen();
  expect(dots()).toHaveLength(1); // the next line is being typed
});

test('several bubbles in a row: each one gets its own dots, one after another', async () => {
  await render(<KaiScreen />);
  await wait(5000);
  expect(kaiLines()).toHaveLength(2);
  expect(dots()).toHaveLength(0);
  await send('Maya');
  await wait(5000);
  await fireEvent.press(screen.getByRole('button', { name: 'English' }));
  // "Here's what I do" and the lines after it come in one at a time
  const seen: number[] = [];
  for (let i = 0; i < 6; i++) {
    expect(dots().length).toBeLessThanOrEqual(1);
    seen.push(kaiLines().length);
    await wait(1200);
  }
  expect(new Set(seen).size).toBeGreaterThanOrEqual(5); // a new bubble every step, not all at once
});

test('reply options wait for Kai’s last bubble', async () => {
  await render(<KaiScreen />);
  await wait(5000);
  await send('Maya');
  expect(screen.getByLabelText('You: Maya')).toBeOnTheScreen(); // the user's bubble shows at once
  expect(screen.queryByRole('button', { name: 'English' })).toBeNull();
  await wait(1200);
  expect(screen.queryByRole('button', { name: 'English' })).toBeNull(); // one of two lines shown
  await wait(1200);
  expect(screen.getByRole('button', { name: 'English' })).toBeOnTheScreen();
});

test('Use it chat: each of Kai’s lines comes after its own dots', async () => {
  const card = { id: 'c1', deckId: 'd', deckTopic: 'Food', word: 'la propina', translation: 'the tip', example: 'Deja propina.', exampleTranslation: 'Leave a tip.', stage: 0 };
  setRound([card]);
  mockParams = { id: 'c1' };
  let answer!: (r: Awaited<ReturnType<typeof api.useIt>>) => void;
  mockApi.useIt.mockReturnValue(new Promise((resolve) => (answer = resolve)));
  await render(<UseItScreen />);
  await wait(5000);
  await send('Dejé propina.');
  expect(screen.getByLabelText('Kai: Checking… 👀')).toBeOnTheScreen(); // a status, shown at once
  expect(dots()).toHaveLength(0);
  await act(async () => answer({ good: true, lines: ['🎉 **Great sentence!**', '👍 You used **propina** well.'], movedUp: false, stage: 1 }));
  expect(screen.queryByLabelText('Kai: Checking… 👀')).toBeNull();
  expect(dots()).toHaveLength(1);
  expect(screen.queryByLabelText('Kai: 🎉 Great sentence!')).toBeNull();
  await wait(typingMs('🎉 Great sentence!'));
  expect(screen.getByLabelText('Kai: 🎉 Great sentence!')).toBeOnTheScreen();
  expect(screen.queryByLabelText('Kai: 👍 You used propina well.')).toBeNull();
  expect(screen.queryByRole('button', { name: 'Next card' })).toBeNull();
  await wait(1200);
  expect(screen.getByLabelText('Kai: 👍 You used propina well.')).toBeOnTheScreen();
  expect(screen.getByRole('button', { name: 'Next card' })).toBeOnTheScreen();
});

test('the deck card’s Generate waits for Kai’s last bubble, so the chat does not move under the tap', async () => {
  await render(<KaiScreen />);
  await wait(5000);
  await send('Maya');
  await wait(5000);
  await fireEvent.press(screen.getByRole('button', { name: 'English' }));
  await wait(10000);
  await fireEvent.press(screen.getByRole('button', { name: 'Ordering food' }));
  await wait(typingMs('Good choice! Here’s your first deck 👇') + 100);
  expect(screen.getByText('“Order food”')).toBeOnTheScreen(); // the card is in the chat
  expect(screen.queryByRole('button', { name: 'Generate' })).toBeNull(); // Kai is still typing the next line
  await wait(1200);
  expect(screen.getByLabelText('Kai: Tap Generate and I will make it for you ✨')).toBeOnTheScreen();
  expect(screen.getByRole('button', { name: 'Generate' })).toBeOnTheScreen();
});
