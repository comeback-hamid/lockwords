import { act, fireEvent, render, screen } from '@testing-library/react-native';
import * as SecureStore from 'expo-secure-store';
import * as Speech from 'expo-speech';
import { AppState, StyleSheet } from 'react-native';

import { createApi, type KaiChat, type KaiMessage, type KaiTurn, type KaiWord } from '@/api/client';
import TabsLayout from '@/app/(tabs)/_layout';
import NewWordsScreen from '@/app/(tabs)/index';
import ReviewScreen from '@/app/(tabs)/review';
import { api } from '@/auth/boot';
import { SECURE_KEYS } from '@/auth/session-storage';
import { WordCard } from '@/components/chat/word-card';
import { clearReviewDot, loadReviewDot, showReviewDot } from '@/review/dot';
import { saveSpeechLanguage } from '@/review/speech-language';
import { colors } from '@/theme/theme';

const mockStore = new Map<string, string>();
jest.mock('expo-secure-store', () => ({
  getItemAsync: jest.fn(async (k: string) => mockStore.get(k) ?? null),
  setItemAsync: jest.fn(async (k: string, v: string) => void mockStore.set(k, v)),
  deleteItemAsync: jest.fn(async (k: string) => void mockStore.delete(k)),
}));
jest.mock('expo-speech', () => ({ speak: jest.fn(), stop: jest.fn() }));
const mockRouter = { push: jest.fn(), replace: jest.fn(), back: jest.fn(), navigate: jest.fn(), canGoBack: () => true };
jest.mock('expo-router', () => ({
  Redirect: () => null,
  useRouter: () => mockRouter,
  // The tab is in view while the screen is mounted.
  useFocusEffect: (effect: () => (() => void) | void) => {
    const { useEffect } = jest.requireActual<typeof import('react')>('react');
    useEffect(() => effect(), [effect]);
  },
}));
// The native tab bar does not draw in Jest: each part becomes a plain view that keeps its props.
jest.mock('expo-router/native-tabs', () => {
  const { View, Text } = jest.requireActual<typeof import('react-native')>('react-native');
  const part = (testID: string) => (props: Record<string, unknown>) => <View testID={testID} {...props} />;
  const Trigger = Object.assign(part('tab'), {
    Label: ({ children }: { children: string }) => <Text>{children}</Text>,
    Icon: () => null,
    Badge: ({ hidden, children }: { hidden?: boolean; children?: string }) => (hidden ? null : <Text testID="tab-badge">{children}</Text>),
  });
  return { NativeTabs: Object.assign(part('tabs'), { Trigger }) };
});
jest.mock('@/onboarding/finished', () => ({ useOnboardingFinished: () => true }));
jest.mock('@/auth/me-store', () => ({ useMe: () => ({ id: 'user-1', isGuest: true, createdAt: '' }) }));
jest.mock('@/auth/boot', () => ({ api: { fetchKaiChat: jest.fn(), openKaiChat: jest.fn(), sendKaiMessage: jest.fn(), setKaiTranslation: jest.fn(), addKaiWord: jest.fn(), fetchRound: jest.fn() } }));
jest.mock('react-native-safe-area-context', () => ({ useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }) }));

const mockApi = jest.mocked(api);
const word = (over: Partial<KaiWord> = {}): KaiWord => ({
  word: 'para llevar',
  translation: 'to go (takeaway)',
  example: 'Un café **para llevar**, por favor.',
  exampleTranslation: 'A coffee to go, please.',
  addTo: 'Random Words 1',
  added: false,
  already: false,
  ...over,
});
let n = 0;
const kai = (text: string, w?: KaiWord): KaiMessage => ({ id: `k${n++}`, from: 'kai', text, translation: `EN: ${text}`, createdAt: '2026-11-18T10:00:00.000Z', ...(w ? { word: w } : {}) });
const user = (text: string): KaiMessage => ({ id: `u${n++}`, from: 'user', text, translation: null, createdAt: '2026-11-18T10:00:00.000Z' });
const chat = (over: Partial<KaiChat> = {}): KaiChat => ({ messages: [], options: [], translationOn: true, nativeLanguage: 'en', ...over });
const turn = (over: Partial<KaiTurn> = {}): { ok: true; turn: KaiTurn } => ({ ok: true, turn: { userMessage: null, messages: [], options: [], action: null, ...over } });
const settle = async (ms = 0) => {
  await act(async () => {
    await jest.advanceTimersByTimeAsync(ms);
  });
};
const addButton = () => screen.getByRole('button', { name: 'Add to Random Words 1' });

beforeEach(async () => {
  jest.useFakeTimers();
  jest.clearAllMocks();
  mockStore.clear();
  await clearReviewDot();
  jest.spyOn(AppState, 'addEventListener').mockImplementation(() => ({ remove: jest.fn() }) as never);
  mockApi.fetchKaiChat.mockResolvedValue(chat());
  mockApi.openKaiChat.mockResolvedValue(turn());
  mockApi.sendKaiMessage.mockResolvedValue(turn());
  mockApi.setKaiTranslation.mockResolvedValue(undefined);
  mockApi.fetchRound.mockResolvedValue([]);
});
afterEach(() => {
  jest.useRealTimers();
  jest.restoreAllMocks();
});

describe('Word card', () => {
  test('shows the word, the speaker, the meaning, the example with the word in green, its translation and the Add button', async () => {
    await render(<WordCard word={word()} onAdd={jest.fn()} />);
    expect(screen.getAllByText('para llevar', { exact: true })).toHaveLength(2); // the word itself, and inside the example
    expect(screen.getByRole('button', { name: 'Say the word' })).toBeOnTheScreen();
    expect(screen.getByText('to go (takeaway)')).toBeOnTheScreen();
    expect(screen.getByTestId('word-card-divider')).toBeOnTheScreen();
    expect(screen.getByLabelText('Un café para llevar, por favor.')).toBeOnTheScreen();
    expect(StyleSheet.flatten(screen.getByTestId('example-word').props.style)).toMatchObject({ color: colors.greenText, fontFamily: 'MonaSans_600SemiBold' });
    expect(screen.getByTestId('example-word')).toHaveTextContent('para llevar');
    expect(screen.getByText('A coffee to go, please.')).toBeOnTheScreen();
    expect(addButton()).toBeEnabled();
  });

  test('an example with no marks: the word is found by itself, capital letters ignored; a word that is not there leaves the sentence plain', async () => {
    const { rerender } = await render(<WordCard word={word({ example: 'Para llevar, por favor.' })} onAdd={jest.fn()} />);
    expect(screen.getByTestId('example-word')).toHaveTextContent('Para llevar');
    await rerender(<WordCard word={word({ word: 'ir', example: 'Voy al mercado.' })} onAdd={jest.fn()} />);
    expect(screen.queryByTestId('example-word')).toBeNull();
    expect(screen.getByLabelText('Voy al mercado.')).toBeOnTheScreen();
  });

  test('the speaker says the word in the learning language', async () => {
    await saveSpeechLanguage('es');
    await render(<WordCard word={word()} onAdd={jest.fn()} />);
    await fireEvent.press(screen.getByRole('button', { name: 'Say the word' }));
    expect(Speech.speak).toHaveBeenLastCalledWith('para llevar', { language: 'es' });
  });

  test('Add: busy while it runs, then "Added" with a check and no more taps', async () => {
    let finish: (r: 'added') => void = () => {};
    const onAdd = jest.fn(() => new Promise<'added' | 'already'>((resolve) => (finish = resolve)));
    await render(<WordCard word={word()} onAdd={onAdd} />);
    await fireEvent.press(addButton());
    expect(onAdd).toHaveBeenCalledTimes(1);
    expect(addButton()).toBeDisabled();
    expect(addButton()).toBeBusy();
    await fireEvent.press(addButton());
    expect(onAdd).toHaveBeenCalledTimes(1);
    await act(async () => finish('added'));
    expect(screen.getByRole('button', { name: 'Added' })).toBeDisabled();
    expect(screen.getByTestId('added-check')).toBeOnTheScreen();
    expect(screen.queryByRole('button', { name: 'Add to Random Words 1' })).toBeNull();
    await fireEvent.press(screen.getByRole('button', { name: 'Added' }));
    expect(onAdd).toHaveBeenCalledTimes(1);
  });

  test('the word was already there: "Already in your words"', async () => {
    await render(<WordCard word={word()} onAdd={async () => 'already'} />);
    await fireEvent.press(addButton());
    await settle();
    expect(screen.getByRole('button', { name: 'Already in your words' })).toBeDisabled();
  });

  test('adding fails: the button comes back with a try-again line, and a second tap works', async () => {
    const onAdd = jest.fn<Promise<'added' | 'already'>, []>().mockRejectedValueOnce(new Error('offline')).mockResolvedValue('added');
    await render(<WordCard word={word()} onAdd={onAdd} />);
    await fireEvent.press(addButton());
    await settle();
    expect(addButton()).toBeEnabled();
    expect(screen.getByText('Couldn’t add it. Try again.')).toBeOnTheScreen();
    await fireEvent.press(addButton());
    await settle();
    expect(screen.getByRole('button', { name: 'Added' })).toBeOnTheScreen();
    expect(screen.queryByText('Couldn’t add it. Try again.')).toBeNull();
  });

  test('what the server says is kept: added, already, and the name of the deck', async () => {
    const { rerender } = await render(<WordCard word={word({ added: true })} onAdd={jest.fn()} />);
    expect(screen.getByRole('button', { name: 'Added' })).toBeDisabled();
    await rerender(<WordCard key="b" word={word({ already: true })} onAdd={jest.fn()} />);
    expect(screen.getByRole('button', { name: 'Already in your words' })).toBeDisabled();
    await rerender(<WordCard key="c" word={word({ addTo: 'Random Words 2' })} onAdd={jest.fn()} />);
    expect(screen.getByRole('button', { name: 'Add to Random Words 2' })).toBeEnabled();
  });
});

describe('New words screen with a word', () => {
  test('Kai answers with a word: the card comes with Kai’s line, under the bubble', async () => {
    mockApi.sendKaiMessage.mockResolvedValue(turn({ userMessage: user('How do I say to go?'), messages: [kai('Se dice **para llevar** 🥡', word())], options: ['Otra forma de decirlo'] }));
    await render(<NewWordsScreen />);
    await settle();
    await fireEvent.changeText(screen.getByLabelText('Message'), 'How do I say to go?');
    await fireEvent.press(screen.getByRole('button', { name: 'Send' }));
    await settle();
    expect(screen.queryByRole('button', { name: 'Add to Random Words 1' })).toBeNull(); // Kai is still typing
    await settle(1200);
    expect(screen.getByLabelText('Kai: Se dice para llevar 🥡')).toBeOnTheScreen();
    expect(addButton()).toBeOnTheScreen();
    expect(screen.getByRole('button', { name: 'Otra forma de decirlo' })).toBeOnTheScreen();
  });

  test('the meaning and the example’s translation show also when translations are off', async () => {
    mockApi.fetchKaiChat.mockResolvedValue(chat({ messages: [kai('Se dice **para llevar**', word())], translationOn: false }));
    await render(<NewWordsScreen />);
    await settle();
    expect(screen.queryByText('EN: Se dice **para llevar**')).toBeNull();
    expect(screen.getByText('to go (takeaway)')).toBeOnTheScreen();
    expect(screen.getByText('A coffee to go, please.')).toBeOnTheScreen();
  });

  test('Add: the server gets the message, the button says "Added" and the Review tab gets its dot', async () => {
    const message = kai('Se dice **para llevar**', word());
    mockApi.fetchKaiChat.mockResolvedValue(chat({ messages: [message] }));
    mockApi.addKaiWord.mockResolvedValue({ deckId: 'd1', deckTitle: 'Random Words 1', count: 1, already: false });
    await render(
      <>
        <NewWordsScreen />
        <TabsLayout />
      </>,
    );
    await settle();
    expect(screen.queryByTestId('tab-badge')).toBeNull();
    await fireEvent.press(addButton());
    await settle();
    expect(mockApi.addKaiWord).toHaveBeenCalledWith(message.id);
    expect(screen.getByRole('button', { name: 'Added' })).toBeDisabled();
    expect(screen.getByTestId('tab-badge')).toBeOnTheScreen();
  });

  test('already in the words: the button says so and there is no dot; a failed add shows the try-again line', async () => {
    mockApi.fetchKaiChat.mockResolvedValue(chat({ messages: [kai('Se dice **para llevar**', word())] }));
    mockApi.addKaiWord.mockRejectedValueOnce(new Error('offline')).mockResolvedValue({ deckId: 'd0', deckTitle: 'Order food', count: 10, already: true });
    await render(
      <>
        <NewWordsScreen />
        <TabsLayout />
      </>,
    );
    await settle();
    await fireEvent.press(addButton());
    await settle();
    expect(screen.getByText('Couldn’t add it. Try again.')).toBeOnTheScreen();
    await fireEvent.press(addButton());
    await settle();
    expect(screen.getByRole('button', { name: 'Already in your words' })).toBeDisabled();
    expect(screen.queryByTestId('tab-badge')).toBeNull();
  });

  test('after a restart the card still says "Added"', async () => {
    mockApi.fetchKaiChat.mockResolvedValue(chat({ messages: [kai('Se dice **para llevar**', word({ added: true }))] }));
    await render(<NewWordsScreen />);
    await settle();
    expect(screen.getByRole('button', { name: 'Added' })).toBeDisabled();
  });
});

describe('Review dot', () => {
  test('set, kept after a restart, cleared when Review opens', async () => {
    expect(SECURE_KEYS).toContain('lockwords.reviewDot'); // so a fresh install clears it
    const { rerender } = await render(<TabsLayout />);
    expect(screen.queryByTestId('tab-badge')).toBeNull();
    await act(async () => showReviewDot());
    expect(screen.getByTestId('tab-badge')).toBeOnTheScreen();
    expect(SecureStore.setItemAsync).toHaveBeenCalledWith('lockwords.reviewDot', '1');

    // "Restart": the flag is read at start.
    await act(async () => loadReviewDot());
    expect(screen.getByTestId('tab-badge')).toBeOnTheScreen();

    await rerender(
      <>
        <TabsLayout />
        <ReviewScreen />
      </>,
    );
    await settle();
    expect(screen.getByText('All done for today')).toBeOnTheScreen();
    expect(screen.queryByTestId('tab-badge')).toBeNull();
    expect(mockStore.has('lockwords.reviewDot')).toBe(false);
    await act(async () => loadReviewDot());
    expect(screen.queryByTestId('tab-badge')).toBeNull();
  });
});

describe('api.addKaiWord', () => {
  const make = (fetchFn: jest.Mock) => createApi({ baseUrl: 'http://server.test', getToken: async () => 't', fetch: fetchFn as unknown as typeof fetch });
  test('posts to the message and gives the result; an error throws', async () => {
    const result = { deckId: 'd1', deckTitle: 'Random Words 1', count: 1, already: false };
    const ok = jest.fn(async (_request: Request) => new Response(JSON.stringify(result), { status: 200, headers: { 'Content-Type': 'application/json' } }));
    expect(await make(ok).addKaiWord('m1')).toEqual(result);
    const request = ok.mock.calls[0]![0];
    expect(request.method).toBe('POST');
    expect(request.url).toBe('http://server.test/v1/kai/chat/messages/m1/add-word');
    const gone = jest.fn(async () => new Response(JSON.stringify({ error: 'not_found' }), { status: 404, headers: { 'Content-Type': 'application/json' } }));
    await expect(make(gone).addKaiWord('m1')).rejects.toThrow();
  });
});
