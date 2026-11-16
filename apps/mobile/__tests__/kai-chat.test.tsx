import { act, fireEvent, render, screen, waitFor } from '@testing-library/react-native';

import type { Deck } from '@/api/client';
import DeckScreen from '@/app/deck/[id]';
import KaiScreen from '@/app/onboarding/kai';
import { api } from '@/auth/boot';
import { ChatBubble } from '@/components/chat/chat-bubble';
import { Composer } from '@/components/chat/composer';
import { DeckCard } from '@/components/chat/deck-card';
import { ReplyOptions } from '@/components/chat/reply-options';
import { markOnboardingFinished } from '@/onboarding/finished';
import { chatLanguageOptions, explainLines, openingLines, poseFor } from '@/onboarding/kai-script';
import { resetAnswers, setAnswers } from '@/onboarding/store';

const mockRouter = { push: jest.fn(), replace: jest.fn(), back: jest.fn(), canGoBack: () => true };
let mockParams: Record<string, string> = {};
jest.mock('expo-router', () => ({ useRouter: () => mockRouter, useLocalSearchParams: () => mockParams }));
jest.mock('@/auth/boot', () => ({ api: { saveChat: jest.fn(), fetchDeckIdeas: jest.fn(), proposeDeck: jest.fn(), generateDeck: jest.fn(), fetchDeck: jest.fn() } }));
jest.mock('@/onboarding/finished', () => ({ markOnboardingFinished: jest.fn(async () => {}) }));
jest.mock('react-native-safe-area-context', () => ({ useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }) }));

const mockApi = jest.mocked(api);
const ideas = ['Ordering food', 'Getting around the city', 'Meeting new people', 'At the hotel'];
const proposed: Deck = { id: 'd1', topic: 'Ordering food', title: 'Order food, pay and tip in restaurants.', reason: 'For your trip', cefr: 'A2+', wordCount: 10, status: 'proposed', cards: [] };
const ready: Deck = {
  ...proposed,
  status: 'ready',
  cards: Array.from({ length: 10 }, (_, i) => ({ id: `c${i}`, position: i, word: `palabra ${i}`, translation: `word ${i}`, example: 'e', exampleTranslation: 't', stage: 0 })),
};
const kaiSays = (text: string) => screen.getByLabelText(`Kai: ${text}`);
const send = async (text: string) => {
  await fireEvent.changeText(screen.getByLabelText('Message'), text);
  await fireEvent.press(screen.getByRole('button', { name: 'Send' }));
};

beforeEach(() => {
  resetAnswers();
  setAnswers({ learning: { code: 'es', name: 'Spanish' }, speaks: { code: 'en', name: 'English' } });
  mockParams = {};
  jest.clearAllMocks();
  mockApi.saveChat.mockImplementation(async (c) => c);
  mockApi.fetchDeckIdeas.mockResolvedValue(ideas);
  mockApi.proposeDeck.mockResolvedValue(proposed);
  mockApi.generateDeck.mockResolvedValue(ready);
});

describe('script', () => {
  test('opening lines use the language; chat language options use each language’s own name', () => {
    expect(openingLines('Spanish')).toEqual(['Hi! I’m Kai 👋', 'I’ll help you learn **Spanish** words. What’s your name?']);
    expect(chatLanguageOptions({ code: 'en', name: 'English' }, { code: 'es', name: 'Spanish' })).toEqual([
      { label: 'English', value: 'native' },
      { label: 'Español', value: 'target' },
    ]);
    expect(chatLanguageOptions({ code: 'fa', name: 'Persian' }, { code: null, name: 'Swedish' }).map((o) => o.label)).toEqual(['فارسی', 'Swedish']);
    expect(explainLines.at(-1)).toBe('Let’s start with **10 new words**. What do you want to learn? 🌮');
  });
  test('Kai’s pose follows the step', () => {
    expect((['name', 'language', 'topic', 'proposed', 'generating', 'ready'] as const).map(poseFor)).toEqual(['greeting', 'idle', 'idle', 'listening', 'thinking', 'celebrate']);
  });
});

describe('chat parts', () => {
  test('Kai bubble shows bold words; the label is the plain text', async () => {
    await render(<ChatBubble from="kai" text="Nice to meet you, **Maya**! 😊" />);
    expect(kaiSays('Nice to meet you, Maya! 😊')).toBeOnTheScreen();
    expect(screen.getByText('Maya').props.style).toEqual(expect.arrayContaining([expect.objectContaining({ fontFamily: 'MonaSans_600SemiBold' })]));
  });
  test('user bubble', async () => {
    await render(<ChatBubble from="user" text="Maya" />);
    expect(screen.getByLabelText('You: Maya')).toBeOnTheScreen();
  });
  test('reply options show a hint and report the tapped one', async () => {
    const onPick = jest.fn();
    await render(<ReplyOptions options={['Ordering food', 'At the hotel']} onPick={onPick} />);
    expect(screen.getByText('Tap an option, or type your own')).toBeOnTheScreen();
    await fireEvent.press(screen.getByRole('button', { name: 'At the hotel' }));
    expect(onPick).toHaveBeenCalledWith('At the hotel');
  });
  test('composer: mic when empty, send when there is text; sending clears; blank text is not sent', async () => {
    const onSend = jest.fn();
    await render(<Composer placeholder="Type a message…" onSend={onSend} />);
    expect(screen.getByRole('button', { name: 'Voice message' })).toBeOnTheScreen();
    await fireEvent.changeText(screen.getByLabelText('Message'), '   ');
    expect(screen.queryByRole('button', { name: 'Send' })).toBeNull();
    await fireEvent.changeText(screen.getByLabelText('Message'), ' Maya ');
    await fireEvent.press(screen.getByRole('button', { name: 'Send' }));
    expect(onSend).toHaveBeenCalledWith('Maya');
    expect(screen.getByLabelText('Message').props.value).toBe('');
  });
  test('deck card: proposed, generating, ready', async () => {
    const onGenerate = jest.fn();
    const onOpen = jest.fn();
    const view = await render(<DeckCard deck={proposed} state="proposed" onGenerate={onGenerate} onOpen={onOpen} />);
    expect(screen.getByText('A2+ · 10 WORDS')).toBeOnTheScreen();
    expect(screen.getByText('“Order food, pay and tip in restaurants.”')).toBeOnTheScreen();
    expect(screen.getByText('For your trip')).toBeOnTheScreen();
    await fireEvent.press(screen.getByRole('button', { name: 'Generate' }));
    expect(onGenerate).toHaveBeenCalled();

    await view.rerender(<DeckCard deck={proposed} state="generating" onGenerate={onGenerate} onOpen={onOpen} />);
    expect(screen.getByText('Making your deck…')).toBeOnTheScreen();
    expect(screen.queryByRole('button', { name: 'Generate' })).toBeNull();

    await view.rerender(<DeckCard deck={ready} state="ready" onGenerate={onGenerate} onOpen={onOpen} />);
    expect(screen.getByText('10 WORDS · ADDED TO YOUR DECKS')).toBeOnTheScreen();
    expect(screen.getByText('JUST NOW')).toBeOnTheScreen();
    await fireEvent.press(screen.getByRole('button', { name: 'Open deck' }));
    expect(onOpen).toHaveBeenCalled();
  });
});

describe('O10–O10f Kai chat', () => {
  const untilReady = async () => {
    await render(<KaiScreen />);
    await send('Maya');
    await fireEvent.press(screen.getByRole('button', { name: 'English' }));
    await waitFor(() => expect(screen.getByRole('button', { name: 'Ordering food' })).toBeOnTheScreen());
    await fireEvent.press(screen.getByRole('button', { name: 'Ordering food' }));
    await waitFor(() => expect(screen.getByRole('button', { name: 'Generate' })).toBeOnTheScreen());
    await fireEvent.press(screen.getByRole('button', { name: 'Generate' }));
    await waitFor(() => expect(screen.getByText('10 WORDS · ADDED TO YOUR DECKS')).toBeOnTheScreen());
  };

  test('name → chat language → what Kai does → topic → deck card → generating → ready', async () => {
    let finish!: (d: Deck) => void;
    mockApi.generateDeck.mockReturnValue(new Promise((resolve) => (finish = resolve)));
    await render(<KaiScreen />);
    expect(kaiSays('Hi! I’m Kai 👋')).toBeOnTheScreen();
    expect(kaiSays('I’ll help you learn Spanish words. What’s your name?')).toBeOnTheScreen();

    await send('Maya');
    expect(screen.getByLabelText('You: Maya')).toBeOnTheScreen();
    expect(kaiSays('Nice to meet you, Maya! 😊')).toBeOnTheScreen();
    expect(kaiSays('Which language should we chat in?')).toBeOnTheScreen();
    expect(screen.getByRole('button', { name: 'Español' })).toBeOnTheScreen();

    await fireEvent.press(screen.getByRole('button', { name: 'English' }));
    expect(mockApi.saveChat).toHaveBeenCalledWith({ name: 'Maya', chatLanguage: 'native' });
    expect(screen.getByLabelText('You: English')).toBeOnTheScreen();
    expect(kaiSays('🔒 Hard words go to your lock screen')).toBeOnTheScreen();
    expect(kaiSays('Let’s start with 10 new words. What do you want to learn? 🌮')).toBeOnTheScreen();
    await waitFor(() => expect(screen.getByRole('button', { name: 'At the hotel' })).toBeOnTheScreen());
    expect(screen.getByLabelText('Message').props.placeholder).toBe('Or tell me what you need…');

    await fireEvent.press(screen.getByRole('button', { name: 'Ordering food' }));
    expect(mockApi.proposeDeck).toHaveBeenCalledWith('Ordering food');
    await waitFor(() => expect(screen.getByText('“Order food, pay and tip in restaurants.”')).toBeOnTheScreen());
    expect(kaiSays('Good choice! Here’s your first deck 👇')).toBeOnTheScreen();
    expect(kaiSays('Tap Generate and I will make it for you ✨')).toBeOnTheScreen();

    await fireEvent.press(screen.getByRole('button', { name: 'Generate' }));
    expect(mockApi.generateDeck).toHaveBeenCalledWith('d1');
    expect(screen.getByText('Making your deck…')).toBeOnTheScreen();
    expect(kaiSays('Picking the best words for your level… ⏳')).toBeOnTheScreen();

    await act(async () => finish(ready));
    await waitFor(() => expect(screen.getByText('10 WORDS · ADDED TO YOUR DECKS')).toBeOnTheScreen());
    expect(kaiSays('Your deck is ready! 🎉 Tap it any time to see the words.')).toBeOnTheScreen();
    expect(kaiSays('Shall we practice them now? 💪')).toBeOnTheScreen();
    expect(markOnboardingFinished).not.toHaveBeenCalled();
  });

  test('“OK, let’s practice!” finishes onboarding and opens Review', async () => {
    await untilReady();
    await fireEvent.press(screen.getByRole('button', { name: 'OK, let’s practice!' }));
    await waitFor(() => expect(mockRouter.replace).toHaveBeenCalledWith('/(tabs)/review'));
    expect(markOnboardingFinished).toHaveBeenCalled();
  });

  test('“Show me the words first” finishes onboarding and opens the deck', async () => {
    await untilReady();
    await fireEvent.press(screen.getByRole('button', { name: 'Show me the words first' }));
    await waitFor(() => expect(mockRouter.replace).toHaveBeenCalledWith('/deck/d1'));
    expect(markOnboardingFinished).toHaveBeenCalled();
  });

  test('a typed topic works when the ideas cannot be loaded; saving the name may fail quietly', async () => {
    mockApi.fetchDeckIdeas.mockRejectedValue(new Error('down'));
    mockApi.saveChat.mockRejectedValue(new Error('down'));
    await render(<KaiScreen />);
    await send('Maya');
    await fireEvent.press(screen.getByRole('button', { name: 'Español' }));
    expect(mockApi.saveChat).toHaveBeenCalledWith({ name: 'Maya', chatLanguage: 'target' });
    expect(kaiSays('Let’s start with 10 new words. What do you want to learn? 🌮')).toBeOnTheScreen();
    expect(screen.queryByRole('button', { name: 'Ordering food' })).toBeNull();
    await send('Football');
    expect(mockApi.proposeDeck).toHaveBeenCalledWith('Football');
    await waitFor(() => expect(screen.getByRole('button', { name: 'Generate' })).toBeOnTheScreen());
  });

  test('proposing fails → Kai offers Try again', async () => {
    mockApi.proposeDeck.mockRejectedValueOnce(new Error('down'));
    await render(<KaiScreen />);
    await send('Maya');
    await fireEvent.press(screen.getByRole('button', { name: 'English' }));
    await waitFor(() => expect(screen.getByRole('button', { name: 'Ordering food' })).toBeOnTheScreen());
    await fireEvent.press(screen.getByRole('button', { name: 'Ordering food' }));
    await waitFor(() => expect(kaiSays('I could not reach the server. Tap to try again.')).toBeOnTheScreen());
    await fireEvent.press(screen.getByRole('button', { name: 'Try again' }));
    await waitFor(() => expect(screen.getByRole('button', { name: 'Generate' })).toBeOnTheScreen());
    expect(mockApi.proposeDeck).toHaveBeenCalledTimes(2);
  });

  test('making fails → the card is back to Generate', async () => {
    mockApi.generateDeck.mockRejectedValueOnce(new Error('502'));
    await render(<KaiScreen />);
    await send('Maya');
    await fireEvent.press(screen.getByRole('button', { name: 'English' }));
    await waitFor(() => expect(screen.getByRole('button', { name: 'Ordering food' })).toBeOnTheScreen());
    await fireEvent.press(screen.getByRole('button', { name: 'Ordering food' }));
    await waitFor(() => expect(screen.getByRole('button', { name: 'Generate' })).toBeOnTheScreen());
    await fireEvent.press(screen.getByRole('button', { name: 'Generate' }));
    await waitFor(() => expect(kaiSays('That did not work. Tap Generate to try again.')).toBeOnTheScreen());
    await fireEvent.press(screen.getByRole('button', { name: 'Generate' }));
    await waitFor(() => expect(screen.getByText('10 WORDS · ADDED TO YOUR DECKS')).toBeOnTheScreen());
  });
});

describe('Deck page', () => {
  beforeEach(() => (mockParams = { id: 'd1' }));

  test('loading, then the title and 10 words with translations', async () => {
    let answer!: (d: Deck) => void;
    mockApi.fetchDeck.mockReturnValue(new Promise((resolve) => (answer = resolve)));
    await render(<DeckScreen />);
    expect(screen.getByText('Loading words…')).toBeOnTheScreen();
    await act(async () => answer(ready));
    await waitFor(() => expect(screen.getByRole('header', { name: 'Ordering food' })).toBeOnTheScreen());
    expect(mockApi.fetchDeck).toHaveBeenCalledWith('d1');
    expect(screen.getByText('palabra 0')).toBeOnTheScreen();
    expect(screen.getByText('word 9')).toBeOnTheScreen();
    await fireEvent.press(screen.getByRole('button', { name: 'Close' }));
    expect(mockRouter.replace).toHaveBeenCalledWith('/(tabs)');
  });

  test('error shows Try again', async () => {
    mockApi.fetchDeck.mockRejectedValueOnce(new Error('down')).mockResolvedValue(ready);
    await render(<DeckScreen />);
    await waitFor(() => expect(screen.getByText('Could not load the deck.')).toBeOnTheScreen());
    await fireEvent.press(screen.getByRole('button', { name: 'Try again' }));
    await waitFor(() => expect(screen.getByText('palabra 0')).toBeOnTheScreen());
  });
});
