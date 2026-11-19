import { act, fireEvent, render, screen } from '@testing-library/react-native';
import { AppState, StyleSheet } from 'react-native';

import type { KaiChat, KaiMessage, KaiTurn, KaiWord } from '@/api/client';
import NewWordsScreen from '@/app/(tabs)/index';
import { api } from '@/auth/boot';
import { ChatBubble } from '@/components/chat/chat-bubble';
import { Composer } from '@/components/chat/composer';
import { DeckCard } from '@/components/chat/deck-card';
import { directionStyle, isRtl } from '@/components/chat/direction';
import { WordCard } from '@/components/chat/word-card';
import { newWordsKaiState, QUIET_MS, SLEEP_MS, type NewWordsMoment } from '@/new-words/chat';

// Change new-words-polish: Kai's states on the New words screen, the tapped option, right-to-left text, older messages.
const mockRouter = { push: jest.fn(), replace: jest.fn(), back: jest.fn(), navigate: jest.fn(), canGoBack: () => true };
jest.mock('expo-router', () => ({
  useRouter: () => mockRouter,
  useFocusEffect: (effect: () => (() => void) | void) => {
    const { useEffect } = jest.requireActual<typeof import('react')>('react');
    useEffect(() => effect(), [effect]);
  },
}));
jest.mock('expo-speech', () => ({ speak: jest.fn(), stop: jest.fn() }));
jest.mock('expo-secure-store', () => ({ getItemAsync: jest.fn(async () => null), setItemAsync: jest.fn(async () => {}), deleteItemAsync: jest.fn(async () => {}) }));
jest.mock('@/auth/me-store', () => ({ useMe: () => ({ id: 'user-1', isGuest: true, createdAt: '' }) }));
jest.mock('@/auth/boot', () => ({ api: { fetchKaiChat: jest.fn(), openKaiChat: jest.fn(), sendKaiMessage: jest.fn(), setKaiTranslation: jest.fn(), addKaiWord: jest.fn() } }));
jest.mock('react-native-safe-area-context', () => ({ useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }) }));

const mockApi = jest.mocked(api);
let n = 0;
const kai = (text: string, over: Partial<KaiMessage> = {}): KaiMessage => ({ id: `k${n++}`, from: 'kai', text, translation: `EN: ${text}`, createdAt: '2026-11-19T10:00:00.000Z', ...over });
const user = (text: string): KaiMessage => ({ id: `u${n++}`, from: 'user', text, translation: null, createdAt: '2026-11-19T10:00:00.000Z' });
const chat = (over: Partial<KaiChat> = {}): KaiChat => ({ messages: [], options: [], translationOn: true, nativeLanguage: 'en', ...over });
const turn = (over: Partial<KaiTurn> = {}): { ok: true; turn: KaiTurn } => ({ ok: true, turn: { userMessage: null, messages: [], options: [], action: null, ...over } });
const word: KaiWord = { word: 'para llevar', translation: 'to go (takeaway)', example: 'Un café **para llevar**, por favor.', exampleTranslation: 'A coffee to go, please.', addTo: 'Random Words 1', added: false, already: false };
const settle = async (ms = 0) => {
  await act(async () => {
    await jest.advanceTimersByTimeAsync(ms);
  });
};
const kaiState = () => screen.getByTestId('kai-canvas').props.state;
const type = (text: string) => fireEvent.changeText(screen.getByLabelText('Message'), text);
const styleOf = (el: { props: { style?: unknown } }) => StyleSheet.flatten(el.props.style as never) as Record<string, unknown>;
const RTL = { textAlign: 'right', writingDirection: 'rtl' };
const LTR = { textAlign: 'left', writingDirection: 'ltr' };
const FA = 'سلام! امروز چه خبر؟';
const EN = 'Hi! What’s new today?';

beforeEach(() => {
  jest.useFakeTimers();
  jest.clearAllMocks();
  jest.spyOn(AppState, 'addEventListener').mockImplementation(() => ({ remove: jest.fn() }) as never);
  mockApi.fetchKaiChat.mockResolvedValue(chat());
  mockApi.openKaiChat.mockResolvedValue(turn());
  mockApi.sendKaiMessage.mockResolvedValue(turn());
  mockApi.setKaiTranslation.mockResolvedValue(undefined);
});
afterEach(() => {
  jest.useRealTimers();
  jest.restoreAllMocks();
});

describe('Kai’s state: the rule', () => {
  const calm: NewWordsMoment = { failed: false, making: false, waiting: false, typing: false, composerText: false, rest: null, celebrate: false, greeting: false };
  test('one state at a time, in the shared order', () => {
    const all: NewWordsMoment = { failed: true, making: true, waiting: true, typing: true, composerText: true, rest: 'sleeping', celebrate: true, greeting: true };
    const order: [keyof NewWordsMoment, string][] = [['failed', 'oops'], ['making', 'making'], ['waiting', 'thinking'], ['typing', 'speaking'], ['composerText', 'listening'], ['rest', 'sleeping'], ['celebrate', 'celebrate'], ['greeting', 'greeting']];
    let m = all;
    for (const [key, state] of order) {
      expect(newWordsKaiState(m)).toBe(state);
      m = { ...m, [key]: key === 'rest' ? null : false };
    }
    expect(newWordsKaiState(m)).toBe('idle');
    expect(m).toEqual(calm);
  });
  test('quiet for 20 seconds is waiting, for 2 minutes is sleeping', () => {
    expect([QUIET_MS, SLEEP_MS]).toEqual([20_000, 120_000]);
    expect(newWordsKaiState({ ...calm, rest: 'waiting' })).toBe('waiting');
    expect(newWordsKaiState({ ...calm, rest: 'sleeping' })).toBe('sleeping');
  });
});

describe('Kai’s state on the screen', () => {
  test('a turn: listening while the box has text, thinking while the server works, speaking while Kai types, then idle', async () => {
    let answer: (t: { ok: true; turn: KaiTurn }) => void = () => {};
    mockApi.sendKaiMessage.mockReturnValue(new Promise((resolve) => (answer = resolve)));
    await render(<NewWordsScreen />);
    await settle();
    expect(kaiState()).toBe('idle');
    await type('Hola');
    expect(kaiState()).toBe('listening');
    await fireEvent.press(screen.getByRole('button', { name: 'Send' }));
    expect(kaiState()).toBe('thinking');
    await act(async () => answer(turn({ userMessage: user('Hola'), messages: [kai('¡Hola!')] })));
    expect(kaiState()).toBe('speaking');
    await settle(1200);
    expect(screen.getByLabelText('Kai: ¡Hola!')).toBeOnTheScreen();
    expect(kaiState()).toBe('idle');
  });

  test('a turn fails: oops for a moment, then Kai listens to the text that is back in the box', async () => {
    mockApi.sendKaiMessage.mockResolvedValue({ ok: false, error: 'failed' });
    await render(<NewWordsScreen />);
    await settle();
    await type('Hola');
    await fireEvent.press(screen.getByRole('button', { name: 'Send' }));
    await settle();
    expect(kaiState()).toBe('oops');
    await settle(1300);
    expect(screen.getByLabelText('Message').props.value).toBe('Hola');
    expect(kaiState()).toBe('listening');
  });

  test('quiet: waiting after 20 seconds, sleeping after 2 minutes, listening as soon as the learner types', async () => {
    mockApi.fetchKaiChat.mockResolvedValue(chat({ messages: [kai('¿Practicamos?')], options: ['Sí'] }));
    await render(<NewWordsScreen />);
    await settle();
    await settle(QUIET_MS - 1000);
    expect(kaiState()).toBe('idle');
    await settle(1100);
    expect(kaiState()).toBe('waiting');
    await settle(SLEEP_MS - QUIET_MS);
    expect(kaiState()).toBe('sleeping');
    await type('H');
    expect(kaiState()).toBe('listening');
    // The clock starts again: an empty box is not "sleeping" at once.
    await type('');
    expect(kaiState()).toBe('idle');
    await settle(QUIET_MS + 100);
    expect(kaiState()).toBe('waiting');
    // A scroll wakes Kai too.
    await fireEvent(screen.getByTestId('chat-messages'), 'scrollBeginDrag');
    expect(kaiState()).toBe('idle');
  });

  test('Kai opens the chat: speaking while the lines are typed, then greeting', async () => {
    mockApi.openKaiChat.mockResolvedValue(turn({ messages: [kai('¡Hola Maya! 👋')] }));
    await render(<NewWordsScreen />);
    await settle();
    expect(kaiState()).toBe('speaking');
    await settle(1200);
    expect(kaiState()).toBe('greeting');
  });

  test('a word is added: celebrate; a word the learner already had: no celebrate', async () => {
    mockApi.fetchKaiChat.mockResolvedValue(chat({ messages: [kai('Se dice así:', { word })] }));
    mockApi.addKaiWord.mockResolvedValue({ deckId: 'd1', deckTitle: 'Random Words 1', count: 1, already: false });
    const view = await render(<NewWordsScreen />);
    await settle();
    await fireEvent.press(screen.getByRole('button', { name: 'Add to Random Words 1' }));
    await settle();
    expect(kaiState()).toBe('celebrate');
    await view.unmount();

    mockApi.addKaiWord.mockResolvedValue({ deckId: 'd1', deckTitle: 'Random Words 1', count: 1, already: true });
    await render(<NewWordsScreen />);
    await settle();
    await fireEvent.press(screen.getByRole('button', { name: 'Add to Random Words 1' }));
    await settle();
    expect(kaiState()).toBe('idle');
  });
});

describe('a tapped option moves up', () => {
  test('the tapped option rises into the chat; a typed message does not', async () => {
    mockApi.fetchKaiChat.mockResolvedValue(chat({ messages: [kai('¿Practicamos?')], options: ['Ahora no'] }));
    await render(<NewWordsScreen />);
    await settle();
    await fireEvent.press(screen.getByRole('button', { name: 'Ahora no' }));
    expect(screen.getByTestId('rise-in')).toContainElement(screen.getByLabelText('You: Ahora no'));
    await settle(1200);
    await type('Hola');
    await fireEvent.press(screen.getByRole('button', { name: 'Send' }));
    expect(screen.getByLabelText('You: Hola')).toBeOnTheScreen();
    expect(screen.getAllByTestId('rise-in')).toHaveLength(1);
  });
});

describe('right-to-left text', () => {
  test('a text is right-to-left when most of its letters are', () => {
    expect([isRtl(FA), isRtl('مرحبا'), isRtl('שלום'), isRtl('این کلمه یعنی tip')]).toEqual([true, true, true, true]);
    expect([isRtl(EN), isRtl('¡Hola!'), isRtl('こんにちは'), isRtl(''), isRtl('👋 123'), isRtl('The word سلام means hello')]).toEqual([false, false, false, false, false, false]);
    expect(directionStyle(FA)).toEqual(RTL);
    expect(directionStyle(EN)).toEqual(LTR);
  });
  test('learning Persian: Kai’s line is right-aligned, its English translation left-aligned; and the other way round', async () => {
    const view = await render(<ChatBubble from="kai" text={FA} translation={EN} showTranslation />);
    expect(styleOf(screen.getByText(FA))).toMatchObject(RTL);
    expect(styleOf(screen.getByText(EN))).toMatchObject(LTR);
    await view.rerender(<ChatBubble from="kai" text={EN} translation={FA} showTranslation />);
    expect(styleOf(screen.getByText(EN))).toMatchObject(LTR);
    expect(styleOf(screen.getByText(FA))).toMatchObject(RTL);
    await view.rerender(<ChatBubble from="user" text="سلام" />);
    expect(styleOf(screen.getByText('سلام'))).toMatchObject(RTL);
  });
  test('composer: Persian text is right-aligned; an empty box is left-aligned again', async () => {
    await render(<Composer placeholder="Type a message…" onSend={jest.fn()} mic={false} />);
    const box = () => styleOf(screen.getByLabelText('Message'));
    expect(box()).toMatchObject(LTR);
    await fireEvent.changeText(screen.getByLabelText('Message'), 'سلام');
    expect(box()).toMatchObject(RTL);
    await fireEvent.changeText(screen.getByLabelText('Message'), '');
    expect(box()).toMatchObject(LTR);
  });
  test('word card: each text by its own script, and the speaker moves to the left of a right-to-left word', async () => {
    const fa: KaiWord = { ...word, word: 'انعام', translation: 'tip', example: 'من **انعام** می‌دهم.', exampleTranslation: 'I leave a tip.' };
    const view = await render(<WordCard word={fa} onAdd={jest.fn()} />);
    expect(styleOf(screen.getAllByText('انعام')[0]!)).toMatchObject(RTL); // the headline; the word is in the example too
    expect(styleOf(screen.getByText('tip'))).toMatchObject(LTR);
    expect(styleOf(screen.getByLabelText('من انعام می‌دهم.'))).toMatchObject(RTL);
    expect(styleOf(screen.getByText('I leave a tip.'))).toMatchObject(LTR);
    expect(styleOf(screen.getByTestId('word-row'))).toMatchObject({ flexDirection: 'row-reverse' });
    await view.rerender(<WordCard word={word} onAdd={jest.fn()} />);
    expect(styleOf(screen.getAllByText('para llevar')[0]!)).toMatchObject(LTR);
    expect(styleOf(screen.getByText('to go (takeaway)'))).toMatchObject(LTR);
    expect(styleOf(screen.getByTestId('word-row'))).toMatchObject({ flexDirection: 'row' });
  });
  test('deck card: the title, its translation and the reason, each by its own script', async () => {
    const deck = { cefr: 'A2', wordCount: 12, title: 'سفارش غذا', titleTranslation: 'Ordering food', reason: 'برای سفر شما' };
    await render(<DeckCard deck={deck} state="proposed" showTranslation onGenerate={jest.fn()} onOpen={jest.fn()} />);
    expect(styleOf(screen.getByText('“سفارش غذا”'))).toMatchObject(RTL);
    expect(styleOf(screen.getByText('Ordering food'))).toMatchObject(LTR);
    expect(styleOf(screen.getByText('برای سفر شما'))).toMatchObject(RTL);
  });
});

describe('older messages', () => {
  const page = (from: number, to: number) => Array.from({ length: to - from + 1 }, (_, i) => kai(`m${from + i}`, { id: `id-${from + i}` }));
  const toTop = async () => {
    const list = screen.getByTestId('chat-messages');
    await fireEvent(list, 'scrollBeginDrag');
    await fireEvent.scroll(list, { nativeEvent: { contentOffset: { x: 0, y: 0 }, contentSize: { width: 390, height: 4000 }, layoutMeasurement: { width: 390, height: 500 } } });
  };

  test('scroll to the top: the page before loads and shows above, then the next one; the last page ends it', async () => {
    mockApi.fetchKaiChat.mockResolvedValueOnce(chat({ messages: page(71, 120), hasMore: true }));
    await render(<NewWordsScreen />);
    await settle();
    expect(mockApi.fetchKaiChat).toHaveBeenCalledTimes(1);
    expect(screen.queryByLabelText('Kai: m70')).toBeNull();

    let finish: (c: KaiChat) => void = () => {};
    mockApi.fetchKaiChat.mockReturnValueOnce(new Promise((resolve) => (finish = resolve)));
    await toTop();
    expect(mockApi.fetchKaiChat).toHaveBeenLastCalledWith('id-71');
    expect(screen.getByLabelText('Loading older messages')).toBeOnTheScreen();
    await toTop(); // still loading: not asked twice
    expect(mockApi.fetchKaiChat).toHaveBeenCalledTimes(2);
    await act(async () => finish(chat({ messages: page(21, 70), hasMore: true })));
    expect(screen.queryByLabelText('Loading older messages')).toBeNull();
    const shown = screen.getAllByLabelText(/^Kai: m/).map((el) => el.props.accessibilityLabel);
    expect(shown).toHaveLength(100);
    expect([shown[0], shown[49], shown[50], shown[99]]).toEqual(['Kai: m21', 'Kai: m70', 'Kai: m71', 'Kai: m120']);

    mockApi.fetchKaiChat.mockResolvedValueOnce(chat({ messages: page(1, 20) }));
    await toTop();
    await settle();
    expect(mockApi.fetchKaiChat).toHaveBeenLastCalledWith('id-21');
    expect(screen.getAllByLabelText(/^Kai: m/)).toHaveLength(120);
    await toTop(); // the start of the chat: nothing more to load
    expect(mockApi.fetchKaiChat).toHaveBeenCalledTimes(3);
  });

  test('no older messages left: scrolling to the top loads nothing', async () => {
    mockApi.fetchKaiChat.mockResolvedValue(chat({ messages: page(1, 5) }));
    await render(<NewWordsScreen />);
    await settle();
    await toTop();
    expect(mockApi.fetchKaiChat).toHaveBeenCalledTimes(1);
  });

  test('a scroll that is not at the top loads nothing; a failed load is quiet and is tried again', async () => {
    mockApi.fetchKaiChat.mockResolvedValueOnce(chat({ messages: page(71, 120), hasMore: true }));
    await render(<NewWordsScreen />);
    await settle();
    const list = screen.getByTestId('chat-messages');
    await fireEvent(list, 'scrollBeginDrag');
    await fireEvent.scroll(list, { nativeEvent: { contentOffset: { x: 0, y: 900 }, contentSize: { width: 390, height: 4000 }, layoutMeasurement: { width: 390, height: 500 } } });
    expect(mockApi.fetchKaiChat).toHaveBeenCalledTimes(1);

    mockApi.fetchKaiChat.mockRejectedValueOnce(new Error('offline'));
    await toTop();
    await settle();
    expect(screen.queryByLabelText('Loading older messages')).toBeNull();
    expect(screen.queryByText('Kai can’t load the chat.')).toBeNull();
    expect(screen.getAllByLabelText(/^Kai: m/)).toHaveLength(50);
    mockApi.fetchKaiChat.mockResolvedValueOnce(chat({ messages: page(21, 70) }));
    await toTop();
    await settle();
    expect(mockApi.fetchKaiChat).toHaveBeenCalledTimes(3);
    expect(screen.getAllByLabelText(/^Kai: m/)).toHaveLength(100);
  });

  test('the options of the newest line stay when an older page loads', async () => {
    mockApi.fetchKaiChat.mockResolvedValueOnce(chat({ messages: page(71, 120), options: ['Sí'], hasMore: true }));
    mockApi.fetchKaiChat.mockResolvedValueOnce(chat({ messages: page(21, 70), options: [] }));
    await render(<NewWordsScreen />);
    await settle();
    await toTop();
    await settle();
    expect(screen.getByRole('button', { name: 'Sí' })).toBeOnTheScreen();
  });
});
