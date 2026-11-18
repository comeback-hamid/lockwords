import { act, fireEvent, render, screen, waitFor } from '@testing-library/react-native';

import { createApi, type Deck } from '@/api/client';
import KaiScreen from '@/app/onboarding/kai';
import { api } from '@/auth/boot';
import { DeckCard } from '@/components/chat/deck-card';
import { BACK, kaiStateFor, QUIET_MS } from '@/onboarding/kai-script';
import { resetAnswers, setAnswers } from '@/onboarding/store';

// kai-chat-live: talk back to Kai, Kai's state follows the chat, timed deck count, a tapped option rises up.
const mockRouter = { push: jest.fn(), replace: jest.fn(), back: jest.fn(), canGoBack: () => true };
jest.mock('expo-router', () => ({ useRouter: () => mockRouter, useLocalSearchParams: () => ({}) }));
jest.mock('@/auth/boot', () => ({ api: { saveChat: jest.fn(), fetchDeckIdeas: jest.fn(), proposeDeck: jest.fn(), generateDeck: jest.fn(), fetchDeck: jest.fn(), kaiReply: jest.fn() } }));
jest.mock('@/onboarding/finished', () => ({ markOnboardingFinished: jest.fn(async () => {}) }));
jest.mock('react-native-safe-area-context', () => ({ useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }) }));

const mockApi = jest.mocked(api);
const proposed: Deck = { id: 'd1', topic: 'Ordering food', title: 'Order food', reason: 'For your trip', cefr: 'A2', wordCount: 10, status: 'proposed', cards: [] };
const ready: Deck = { ...proposed, status: 'ready', cards: Array.from({ length: 10 }, (_, i) => ({ id: `c${i}`, position: i, word: `w${i}`, translation: `t${i}`, example: 'e', exampleTranslation: 'x', stage: 0 })) };
const kaiSays = (text: string) => screen.getByLabelText(`Kai: ${text}`);
const kaiState = () => screen.getByTestId('kai-canvas').props.state;
const type = async (text: string) => fireEvent.changeText(screen.getByLabelText('Message'), text);
const send = async (text: string) => {
  await type(text);
  await fireEvent.press(screen.getByRole('button', { name: 'Send' }));
};

beforeEach(() => {
  resetAnswers();
  setAnswers({ learning: { code: 'es', name: 'Spanish' }, speaks: { code: 'en', name: 'English' } });
  jest.clearAllMocks();
  mockApi.saveChat.mockImplementation(async (c) => c);
  mockApi.fetchDeckIdeas.mockResolvedValue(['Ordering food']);
  mockApi.proposeDeck.mockResolvedValue(proposed);
  mockApi.generateDeck.mockResolvedValue(ready);
  mockApi.kaiReply.mockImplementation(async (_step, text) => ({ onScript: true, answer: text }));
});

describe('Kai state map', () => {
  const base = { step: 'name' as const, opened: false, typing: false, waiting: false, composerText: false, quiet: false, failed: false };
  test('each moment of the chat has its state', () => {
    expect(kaiStateFor({ ...base, opened: true })).toBe('greeting');
    expect(kaiStateFor({ ...base, step: 'topic' })).toBe('idle');
    expect(kaiStateFor({ ...base, composerText: true })).toBe('listening');
    expect(kaiStateFor({ ...base, waiting: true, composerText: true })).toBe('thinking');
    expect(kaiStateFor({ ...base, typing: true })).toBe('speaking');
    expect(kaiStateFor({ ...base, step: 'generating', typing: true })).toBe('making');
    expect(kaiStateFor({ ...base, step: 'ready' })).toBe('celebrate');
    expect(kaiStateFor({ ...base, failed: true, typing: true })).toBe('oops');
    expect(kaiStateFor({ ...base, quiet: true })).toBe('waiting');
    expect(kaiStateFor({ ...base, quiet: true, composerText: true })).toBe('listening');
  });
});

describe('talk back to Kai', () => {
  test('a name in a sentence', async () => {
    mockApi.kaiReply.mockResolvedValue({ onScript: true, answer: 'Maya' });
    await render(<KaiScreen />);
    await send('I’m Maya');
    expect(mockApi.kaiReply).toHaveBeenCalledWith('name', 'I’m Maya', []);
    expect(screen.getByLabelText('You: I’m Maya')).toBeOnTheScreen();
    await waitFor(() => expect(kaiSays('Nice to meet you, Maya! 😊')).toBeOnTheScreen());
  });

  test('off the script: Kai answers, asks again, and the next name is taken', async () => {
    mockApi.kaiReply.mockResolvedValueOnce({ onScript: false, lines: ['😊 I make **flashcards** with you.'] });
    await render(<KaiScreen />);
    await send('What is this app?');
    await waitFor(() => expect(kaiSays('😊 I make flashcards with you.')).toBeOnTheScreen());
    expect(kaiSays(BACK.name)).toBeOnTheScreen();
    await send('Maya');
    await waitFor(() => expect(kaiSays('Nice to meet you, Maya! 😊')).toBeOnTheScreen());
  });

  test('the Kai reply fails: the typed text is the answer', async () => {
    mockApi.kaiReply.mockRejectedValue(new Error('502'));
    await render(<KaiScreen />);
    await send('Maya');
    await waitFor(() => expect(kaiSays('Nice to meet you, Maya! 😊')).toBeOnTheScreen());
  });

  test('typed language by words, and a tapped option never asks the server', async () => {
    await render(<KaiScreen />);
    await send('Maya');
    await waitFor(() => expect(screen.getByRole('button', { name: 'English' })).toBeOnTheScreen());
    mockApi.kaiReply.mockClear();
    await fireEvent.press(screen.getByRole('button', { name: 'English' }));
    expect(mockApi.kaiReply).not.toHaveBeenCalled();
    expect(mockApi.saveChat).toHaveBeenCalledWith({ name: 'Maya', chatLanguage: 'native' });
  });

  test('typed language answer picks the option', async () => {
    await render(<KaiScreen />);
    await send('Maya');
    await waitFor(() => expect(screen.getByRole('button', { name: 'Español' })).toBeOnTheScreen());
    mockApi.kaiReply.mockResolvedValueOnce({ onScript: true, answer: 'target' });
    await send('en español por favor');
    expect(mockApi.kaiReply).toHaveBeenLastCalledWith('language', 'en español por favor', ['English', 'Español']);
    await waitFor(() => expect(mockApi.saveChat).toHaveBeenCalledWith({ name: 'Maya', chatLanguage: 'target' }));
  });

  test('while the deck is proposed, a failed reply is ignored', async () => {
    await render(<KaiScreen />);
    await send('Maya');
    await waitFor(() => screen.getByRole('button', { name: 'English' }));
    await fireEvent.press(screen.getByRole('button', { name: 'English' }));
    await waitFor(() => screen.getByRole('button', { name: 'Ordering food' }));
    await fireEvent.press(screen.getByRole('button', { name: 'Ordering food' }));
    await waitFor(() => screen.getByRole('button', { name: 'Generate' }));
    mockApi.kaiReply.mockRejectedValueOnce(new Error('502'));
    await send('hmm');
    await waitFor(() => expect(mockApi.kaiReply).toHaveBeenLastCalledWith('proposed', 'hmm', []));
    expect(mockApi.generateDeck).not.toHaveBeenCalled();
    expect(screen.getByRole('button', { name: 'Generate' })).toBeOnTheScreen();
  });
});

describe('Kai state on the screen', () => {
  afterEach(() => jest.useRealTimers());

  test('opens in greeting; listening while typing; waiting after 20 s of quiet', async () => {
    jest.useFakeTimers();
    await render(<KaiScreen />);
    expect(kaiState()).toBe('greeting');
    await type('Ma');
    expect(kaiState()).toBe('listening');
    await type('');
    await act(async () => void jest.advanceTimersByTime(QUIET_MS + 100));
    expect(kaiState()).toBe('waiting');
    await type('M');
    expect(kaiState()).toBe('listening');
  });

  test('making while the deck is made (with progress), then celebrate', async () => {
    let finish!: (d: Deck) => void;
    mockApi.generateDeck.mockReturnValue(new Promise((resolve) => (finish = resolve)));
    await render(<KaiScreen />);
    await send('Maya');
    await waitFor(() => screen.getByRole('button', { name: 'English' }));
    await fireEvent.press(screen.getByRole('button', { name: 'English' }));
    await waitFor(() => screen.getByRole('button', { name: 'Ordering food' }));
    await fireEvent.press(screen.getByRole('button', { name: 'Ordering food' }));
    await waitFor(() => screen.getByRole('button', { name: 'Generate' }));
    await fireEvent.press(screen.getByRole('button', { name: 'Generate' }));
    expect(kaiState()).toBe('making');
    expect(screen.getByTestId('kai-canvas').props.progress).toBeGreaterThan(0);
    await act(async () => finish(ready));
    await waitFor(() => expect(kaiState()).toBe('celebrate'));
  });
});

describe('timed deck count', () => {
  afterEach(() => jest.useRealTimers());

  test('one word about every 1.6 s: 3 at 5 s, never past N − 1 until ready', async () => {
    jest.useFakeTimers();
    await render(<DeckCard deck={proposed} state="generating" onGenerate={jest.fn()} onOpen={jest.fn()} />);
    await act(async () => void jest.advanceTimersByTime(5000));
    expect(screen.getByText('3 / 10 WORDS')).toBeOnTheScreen();
    await act(async () => void jest.advanceTimersByTime(60_000));
    expect(screen.getByText('9 / 10 WORDS')).toBeOnTheScreen();
  });

  test('a bigger deck counts to its own size', async () => {
    jest.useFakeTimers();
    await render(<DeckCard deck={{ ...proposed, wordCount: 20 }} state="generating" onGenerate={jest.fn()} onOpen={jest.fn()} />);
    await act(async () => void jest.advanceTimersByTime(120_000));
    expect(screen.getByText('19 / 20 WORDS')).toBeOnTheScreen();
  });
});

test('api.kaiReply posts the step, the text and the options', async () => {
  const fetchMock = jest.fn(async (req: Request) => {
    expect(req.url).toBe('http://api.test/v1/kai/reply');
    expect(await req.json()).toEqual({ step: 'name', text: 'Maya', options: [] });
    return new Response(JSON.stringify({ onScript: true, answer: 'Maya' }), { status: 200, headers: { 'Content-Type': 'application/json' } });
  });
  const client = createApi({ baseUrl: 'http://api.test', getToken: async () => 'tok', fetch: fetchMock as unknown as typeof fetch });
  expect(await client.kaiReply('name', 'Maya', [])).toEqual({ onScript: true, answer: 'Maya' });
});
