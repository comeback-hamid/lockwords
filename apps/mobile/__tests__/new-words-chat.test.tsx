import { act, fireEvent, render, screen } from '@testing-library/react-native';
import { AppState } from 'react-native';

import { createApi, type KaiChat, type KaiMessage, type KaiTurn } from '@/api/client';
import NewWordsScreen from '@/app/(tabs)/index';
import { api } from '@/auth/boot';
import { ChatBubble } from '@/components/chat/chat-bubble';
import { Composer } from '@/components/chat/composer';
import { TranslationToggle } from '@/components/chat/translation-toggle';
import { languageCode, typingMs } from '@/new-words/chat';

const mockRouter = { push: jest.fn(), replace: jest.fn(), back: jest.fn(), navigate: jest.fn(), canGoBack: () => true };
let mockBlur: (() => void) | void;
jest.mock('expo-router', () => ({
  useRouter: () => mockRouter,
  // The tab is in view while the screen is mounted; `mockBlur()` moves to another tab.
  useFocusEffect: (effect: () => (() => void) | void) => {
    const { useEffect } = jest.requireActual<typeof import('react')>('react');
    useEffect(() => {
      mockBlur = effect();
      return () => void mockBlur?.();
    }, [effect]);
  },
}));
jest.mock('@/auth/me-store', () => ({ useMe: () => ({ id: 'user-1', isGuest: true, createdAt: '' }) }));
jest.mock('@/auth/boot', () => ({ api: { fetchKaiChat: jest.fn(), openKaiChat: jest.fn(), sendKaiMessage: jest.fn(), setKaiTranslation: jest.fn() } }));
jest.mock('react-native-safe-area-context', () => ({ useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }) }));

const mockApi = jest.mocked(api);
let n = 0;
const kai = (text: string, translation: string | null = `EN: ${text}`): KaiMessage => ({ id: `k${n++}`, from: 'kai', text, translation, createdAt: '2026-11-17T10:00:00.000Z' });
const user = (text: string): KaiMessage => ({ id: `u${n++}`, from: 'user', text, translation: null, createdAt: '2026-11-17T10:00:00.000Z' });
const chat = (over: Partial<KaiChat> = {}): KaiChat => ({ messages: [], options: [], translationOn: true, nativeLanguage: 'en', ...over });
const turn = (over: Partial<KaiTurn> = {}): { ok: true; turn: KaiTurn } => ({ ok: true, turn: { userMessage: null, messages: [], options: [], action: null, ...over } });
const NOTHING = turn();
const kaiSays = (text: string) => screen.getByLabelText(`Kai: ${text}`);
const send = async (text: string) => {
  await fireEvent.changeText(screen.getByLabelText('Message'), text);
  await fireEvent.press(screen.getByRole('button', { name: 'Send' }));
};
// Lets promises settle, then moves the clock so Kai's typing bubbles turn into lines.
const settle = async (ms = 0) => {
  await act(async () => {
    await jest.advanceTimersByTimeAsync(ms);
  });
};

beforeEach(() => {
  jest.useFakeTimers();
  jest.clearAllMocks();
  jest.spyOn(AppState, 'addEventListener').mockImplementation(() => ({ remove: jest.fn() }) as never);
  mockApi.fetchKaiChat.mockResolvedValue(chat());
  mockApi.openKaiChat.mockResolvedValue(NOTHING);
  mockApi.sendKaiMessage.mockResolvedValue(NOTHING);
  mockApi.setKaiTranslation.mockResolvedValue(undefined);
});
afterEach(() => {
  jest.useRealTimers();
  jest.restoreAllMocks();
});

describe('chat parts', () => {
  test('Kai bubble shows the translation under a divider when translations are on', async () => {
    await render(<ChatBubble from="kai" text="¡Hola **Maya**!" translation="Hi Maya!" showTranslation />);
    expect(kaiSays('¡Hola Maya!')).toBeOnTheScreen();
    expect(screen.getByText('Hi Maya!')).toBeOnTheScreen();
    expect(screen.getByTestId('translation-divider')).toBeOnTheScreen();
  });
  test('no translation line when translations are off, when there is none, or on a user bubble', async () => {
    const { rerender } = await render(<ChatBubble from="kai" text="¡Hola!" translation="Hi!" showTranslation={false} />);
    expect(screen.queryByText('Hi!')).toBeNull();
    expect(screen.queryByTestId('translation-divider')).toBeNull();
    await rerender(<ChatBubble from="kai" text="¡Hola!" translation={null} showTranslation />);
    expect(screen.queryByTestId('translation-divider')).toBeNull();
    await rerender(<ChatBubble from="user" text="Hola" translation="Hi" showTranslation />);
    expect(screen.queryByText('Hi')).toBeNull();
  });
  test('composer without a mic: no round button when empty, send when there is text', async () => {
    await render(<Composer placeholder="Type a message…" onSend={jest.fn()} mic={false} />);
    expect(screen.queryByRole('button', { name: 'Voice message' })).toBeNull();
    expect(screen.queryByRole('button', { name: 'Send' })).toBeNull();
    await fireEvent.changeText(screen.getByLabelText('Message'), 'Hola');
    expect(screen.getByRole('button', { name: 'Send' })).toBeOnTheScreen();
  });
  test('composer keeps the mic by default, and can start with a text', async () => {
    const { rerender } = await render(<Composer placeholder="Type a message…" onSend={jest.fn()} />);
    expect(screen.getByRole('button', { name: 'Voice message' })).toBeOnTheScreen();
    await rerender(<Composer key="again" placeholder="Type a message…" onSend={jest.fn()} defaultValue="Hola" />);
    expect(screen.getByLabelText('Message').props.value).toBe('Hola');
  });
  test('translation button: shows the language code and says on or off', async () => {
    const onToggle = jest.fn();
    const { rerender } = await render(<TranslationToggle code="EN" on onToggle={onToggle} />);
    expect(screen.getByText('EN')).toBeOnTheScreen();
    await fireEvent.press(screen.getByRole('switch', { name: 'Translation, on' }));
    expect(onToggle).toHaveBeenCalledTimes(1);
    await rerender(<TranslationToggle code="EN" on={false} onToggle={onToggle} />);
    expect(screen.getByRole('switch', { name: 'Translation, off' })).toBeOnTheScreen();
  });
  test('language code: listed codes and names, then the first two letters', () => {
    expect([languageCode('en'), languageCode('Persian'), languageCode('Swedish'), languageCode(null)]).toEqual(['EN', 'FA', 'SW', '']);
  });
  test('typing time: about one second, longer for a long line', () => {
    expect(typingMs('¡Hola!')).toBe(800);
    expect(typingMs('x'.repeat(160))).toBe(1200);
    expect(typingMs('x'.repeat(40))).toBeGreaterThan(800);
  });
});

describe('New words screen', () => {
  test('loading, then a first visit: Kai’s lines come one by one after a typing bubble, options after the last', async () => {
    let finish: (c: KaiChat) => void = () => {};
    mockApi.fetchKaiChat.mockReturnValue(new Promise((resolve) => (finish = resolve)));
    mockApi.openKaiChat.mockResolvedValue(turn({ messages: [kai('¡Hola Maya! 👋 Soy **Kai**.', "Hi Maya! I'm Kai."), kai('¿De qué quieres hablar?', 'What do you want to talk about?')], options: ['Vamos a practicar'] }));
    await render(<NewWordsScreen />);
    expect(screen.getByLabelText('Loading the chat')).toBeOnTheScreen();
    expect(screen.queryByLabelText('Message')).toBeNull();

    await act(async () => finish(chat()));
    await settle();
    expect(screen.getByLabelText('Kai is typing')).toBeOnTheScreen();
    expect(screen.queryByLabelText(/^Kai: ¡Hola/)).toBeNull();
    expect(screen.queryByRole('button', { name: 'Vamos a practicar' })).toBeNull();

    await settle(1200);
    expect(kaiSays('¡Hola Maya! 👋 Soy Kai.')).toBeOnTheScreen();
    expect(screen.getByText("Hi Maya! I'm Kai.")).toBeOnTheScreen();
    expect(screen.queryByLabelText(/^Kai: ¿De qué/)).toBeNull();
    expect(screen.getByLabelText('Kai is typing')).toBeOnTheScreen();

    await settle(1200);
    expect(kaiSays('¿De qué quieres hablar?')).toBeOnTheScreen();
    expect(screen.queryByLabelText('Kai is typing')).toBeNull();
    expect(screen.getByRole('button', { name: 'Vamos a practicar' })).toBeOnTheScreen();
    expect(screen.getByText('Tap an option, or type your own')).toBeOnTheScreen();
    expect(screen.getByRole('button', { name: 'Voice message' })).toBeOnTheScreen(); // the mic is in every chat (Hamid, 2026-11-24)
  });

  test('coming back: the old messages and options show at once, and Kai adds nothing', async () => {
    mockApi.fetchKaiChat.mockResolvedValue(chat({ messages: [kai('¡Hola!', 'Hi!'), user('Hola'), kai('¿Practicamos?', 'Shall we practice?')], options: ['Sí'] }));
    await render(<NewWordsScreen />);
    await settle();
    expect(kaiSays('¡Hola!')).toBeOnTheScreen();
    expect(screen.getByLabelText('You: Hola')).toBeOnTheScreen();
    expect(kaiSays('¿Practicamos?')).toBeOnTheScreen();
    expect(screen.getByRole('button', { name: 'Sí' })).toBeOnTheScreen();
    expect(screen.queryByLabelText('Kai is typing')).toBeNull();
    expect(mockApi.openKaiChat).toHaveBeenCalledTimes(1);
  });

  test('loading fails: an error with Try again, which loads again', async () => {
    mockApi.fetchKaiChat.mockRejectedValueOnce(new Error('offline'));
    await render(<NewWordsScreen />);
    await settle();
    expect(screen.getByText('Kai can’t load the chat.')).toBeOnTheScreen();
    mockApi.fetchKaiChat.mockResolvedValue(chat({ messages: [kai('¡Hola!')] }));
    await fireEvent.press(screen.getByRole('button', { name: 'Try again' }));
    await settle();
    expect(kaiSays('¡Hola!')).toBeOnTheScreen();
  });

  test('a failed opening is quiet: the chat still works', async () => {
    mockApi.openKaiChat.mockResolvedValue({ ok: false, error: 'failed' });
    await render(<NewWordsScreen />);
    await settle();
    expect(screen.getByLabelText('Message')).toBeOnTheScreen();
    expect(screen.queryByText('Kai can’t answer right now.')).toBeNull();
  });

  test('sending typed text: the green bubble shows at once, then Kai’s lines; with no options there is no hint', async () => {
    let answer: (t: { ok: true; turn: KaiTurn }) => void = () => {};
    mockApi.sendKaiMessage.mockReturnValue(new Promise((resolve) => (answer = resolve)));
    mockApi.fetchKaiChat.mockResolvedValue(chat({ messages: [kai('¡Hola!')], options: ['Sí'] }));
    await render(<NewWordsScreen />);
    await settle();
    await send('¿Qué significa propina?');
    expect(mockApi.sendKaiMessage).toHaveBeenCalledWith('¿Qué significa propina?');
    expect(screen.getByLabelText('You: ¿Qué significa propina?')).toBeOnTheScreen();
    expect(screen.queryByRole('button', { name: 'Sí' })).toBeNull();
    expect(screen.getByLabelText('Kai is typing')).toBeOnTheScreen();

    await act(async () => answer(turn({ userMessage: user('¿Qué significa propina?'), messages: [kai('**La propina** es dinero extra. 💸')] })));
    await settle(1200);
    expect(kaiSays('La propina es dinero extra. 💸')).toBeOnTheScreen();
    expect(screen.queryByText('Tap an option, or type your own')).toBeNull();
    expect(screen.getAllByLabelText(/^You: /)).toHaveLength(1);
  });

  test('tapping an option sends its text', async () => {
    mockApi.fetchKaiChat.mockResolvedValue(chat({ messages: [kai('¿Practicamos?')], options: ['Ahora no'] }));
    await render(<NewWordsScreen />);
    await settle();
    await fireEvent.press(screen.getByRole('button', { name: 'Ahora no' }));
    expect(mockApi.sendKaiMessage).toHaveBeenCalledWith('Ahora no');
    expect(screen.getByLabelText('You: Ahora no')).toBeOnTheScreen();
  });

  test('a turn fails: the bubble goes, the text is back in the box, and Try again sends it again', async () => {
    mockApi.sendKaiMessage.mockResolvedValueOnce({ ok: false, error: 'failed' });
    await render(<NewWordsScreen />);
    await settle();
    await send('Hola');
    await settle();
    expect(screen.queryByLabelText('You: Hola')).toBeNull();
    expect(screen.getByLabelText('Message').props.value).toBe('Hola');
    expect(screen.getByText('Kai can’t answer right now.')).toBeOnTheScreen();

    mockApi.sendKaiMessage.mockResolvedValue(turn({ userMessage: user('Hola'), messages: [kai('¡Hola!')] }));
    await fireEvent.press(screen.getByRole('button', { name: 'Try again' }));
    await settle(1200);
    expect(mockApi.sendKaiMessage).toHaveBeenCalledTimes(2);
    expect(screen.getByLabelText('You: Hola')).toBeOnTheScreen();
    expect(kaiSays('¡Hola!')).toBeOnTheScreen();
    expect(screen.queryByText('Kai can’t answer right now.')).toBeNull();
    expect(screen.getByLabelText('Message').props.value).toBe('');
  });

  test('too many messages today: Kai says so and the composer still works', async () => {
    mockApi.sendKaiMessage.mockResolvedValue({ ok: false, error: 'too_many_messages' });
    await render(<NewWordsScreen />);
    await settle();
    await send('Hola');
    await settle(1200);
    expect(kaiSays('We talked a lot today! 😊 Come back tomorrow and we’ll go on.')).toBeOnTheScreen();
    expect(screen.getByLabelText('Message')).toBeOnTheScreen();
  });

  test('translation button: starts as the server says, hides every translation at once, and saves the choice', async () => {
    mockApi.fetchKaiChat.mockResolvedValue(chat({ messages: [kai('¡Hola!', 'Hi!'), kai('¿Practicamos?', 'Shall we practice?')] }));
    await render(<NewWordsScreen />);
    await settle();
    expect(screen.getByText('EN')).toBeOnTheScreen();
    expect(screen.getByText('Hi!')).toBeOnTheScreen();
    await fireEvent.press(screen.getByRole('switch', { name: 'Translation, on' }));
    expect(screen.queryByText('Hi!')).toBeNull();
    expect(screen.queryByText('Shall we practice?')).toBeNull();
    expect(screen.getByRole('switch', { name: 'Translation, off' })).toBeOnTheScreen();
    expect(mockApi.setKaiTranslation).toHaveBeenCalledWith(false);
  });

  test('translation off from the server (kept after a restart): no translation shows; a failed save switches back', async () => {
    mockApi.fetchKaiChat.mockResolvedValue(chat({ messages: [kai('¡Hola!', 'Hi!')], translationOn: false }));
    mockApi.setKaiTranslation.mockRejectedValue(new Error('offline'));
    await render(<NewWordsScreen />);
    await settle();
    expect(screen.queryByText('Hi!')).toBeNull();
    await fireEvent.press(screen.getByRole('switch', { name: 'Translation, off' }));
    await settle();
    expect(screen.getByRole('switch', { name: 'Translation, off' })).toBeOnTheScreen();
  });

  test('typing while Kai answers: the text stays in the box and send waits; no line is lost', async () => {
    let answer: (t: { ok: true; turn: KaiTurn }) => void = () => {};
    mockApi.sendKaiMessage.mockReturnValueOnce(new Promise((resolve) => (answer = resolve)));
    await render(<NewWordsScreen />);
    await settle();
    await send('Hola');
    await send('¿Y tú?'); // Kai is still thinking
    expect(mockApi.sendKaiMessage).toHaveBeenCalledTimes(1);
    expect(screen.getByLabelText('Message').props.value).toBe('¿Y tú?');
    expect(screen.queryByLabelText('You: ¿Y tú?')).toBeNull();

    await act(async () => answer(turn({ userMessage: user('Hola'), messages: [kai('Uno'), kai('Dos')] })));
    await settle(900);
    await fireEvent.press(screen.getByRole('button', { name: 'Send' })); // line two is still coming
    expect(mockApi.sendKaiMessage).toHaveBeenCalledTimes(1);
    await settle(900);
    expect(kaiSays('Dos')).toBeOnTheScreen();
    expect(screen.getByLabelText('Message').props.value).toBe('¿Y tú?'); // the box was not reset by Kai's answer

    await fireEvent.press(screen.getByRole('button', { name: 'Send' }));
    expect(mockApi.sendKaiMessage).toHaveBeenCalledTimes(2);
    expect(screen.getByLabelText('You: ¿Y tú?')).toBeOnTheScreen();
  });

  test('a failed turn gives the options back', async () => {
    mockApi.fetchKaiChat.mockResolvedValue(chat({ messages: [kai('¿Practicamos?')], options: ['Sí', 'Ahora no'] }));
    mockApi.sendKaiMessage.mockResolvedValueOnce({ ok: false, error: 'failed' });
    await render(<NewWordsScreen />);
    await settle();
    await fireEvent.press(screen.getByRole('button', { name: 'Sí' }));
    await settle();
    expect(screen.getByRole('button', { name: 'Sí' })).toBeOnTheScreen();
    expect(screen.getByRole('button', { name: 'Ahora no' })).toBeOnTheScreen();
  });

  test('Kai is asked to open again when the app comes back to the front, not while a turn runs', async () => {
    await render(<NewWordsScreen />);
    await settle();
    expect(mockApi.openKaiChat).toHaveBeenCalledTimes(1);
    const listeners = (AppState.addEventListener as jest.Mock).mock.calls.map((c) => c[1] as (s: string) => void);
    mockApi.openKaiChat.mockResolvedValue(turn({ messages: [kai('¡Hola de nuevo!')] }));
    await act(async () => listeners.forEach((l) => l('active')));
    await settle(1200);
    expect(mockApi.openKaiChat).toHaveBeenCalledTimes(2);
    expect(kaiSays('¡Hola de nuevo!')).toBeOnTheScreen();
    // On another tab: nothing is asked.
    await act(async () => void mockBlur?.());
    await act(async () => listeners.forEach((l) => l('active')));
    expect(mockApi.openKaiChat).toHaveBeenCalledTimes(2);
  });

  test('the learner left for another tab before the second was over: Review does not open', async () => {
    mockApi.sendKaiMessage.mockResolvedValue(turn({ userMessage: user('Vamos'), messages: [kai('Te llevo a Review')], action: 'review' }));
    await render(<NewWordsScreen />);
    await settle();
    await send('Vamos');
    await settle(900);
    await act(async () => void mockBlur?.());
    await settle(1500);
    expect(mockRouter.navigate).not.toHaveBeenCalled();
  });

  test('dev builds show the user id (the guest-login flows read it)', async () => {
    await render(<NewWordsScreen />);
    await settle();
    expect(screen.getByTestId('dev-user-id')).toHaveTextContent('user-1');
  });

  test('lead to Review: Kai’s line shows, and one second later the Review tab opens', async () => {
    mockApi.fetchKaiChat.mockResolvedValue(chat({ messages: [kai('¿Practicamos?')], options: ['Vamos a practicar'] }));
    mockApi.sendKaiMessage.mockResolvedValue(turn({ userMessage: user('Vamos a practicar'), messages: [kai('¡Perfecto! Te llevo a **Review**… 🚀')], action: 'review' }));
    await render(<NewWordsScreen />);
    await settle();
    await fireEvent.press(screen.getByRole('button', { name: 'Vamos a practicar' }));
    await settle(900);
    expect(kaiSays('¡Perfecto! Te llevo a Review… 🚀')).toBeOnTheScreen();
    expect(mockRouter.navigate).not.toHaveBeenCalled();
    await settle(900);
    expect(mockRouter.navigate).not.toHaveBeenCalled();
    await settle(200);
    expect(mockRouter.navigate).toHaveBeenCalledWith('/review');
  });
});

describe('api client', () => {
  const make = (status: number, body: unknown) => {
    const fetchMock = jest.fn(async (_req: Request) => new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } }));
    return { fetchMock, api: createApi({ baseUrl: 'http://api.test', getToken: async () => 'tok', fetch: fetchMock as unknown as typeof fetch }) };
  };
  beforeEach(() => jest.useRealTimers());
  test('sendKaiMessage posts the text; openKaiChat posts open', async () => {
    const body = { userMessage: null, messages: [], options: [], action: null };
    const { api: real, fetchMock } = make(200, body);
    expect(await real.sendKaiMessage('Hola')).toEqual({ ok: true, turn: body });
    expect(await fetchMock.mock.calls[0]![0].json()).toEqual({ text: 'Hola' });
    expect(await real.openKaiChat()).toEqual({ ok: true, turn: body });
    expect(await fetchMock.mock.calls[1]![0].json()).toEqual({ open: true });
    expect(fetchMock.mock.calls[1]![0].url).toBe('http://api.test/v1/kai/chat/turns');
  });
  test('a 429 is "too_many_messages"; any other failure is "failed"', async () => {
    expect(await make(429, { error: 'too_many_messages' }).api.sendKaiMessage('Hola')).toEqual({ ok: false, error: 'too_many_messages' });
    expect(await make(502, { error: 'kai_unavailable' }).api.sendKaiMessage('Hola')).toEqual({ ok: false, error: 'failed' });
    const down = createApi({ baseUrl: 'http://api.test', getToken: async () => 'tok', fetch: (async () => Promise.reject(new Error('offline'))) as unknown as typeof fetch });
    expect(await down.sendKaiMessage('Hola')).toEqual({ ok: false, error: 'failed' });
  });
  test('fetchKaiChat and setKaiTranslation', async () => {
    const c = { messages: [], options: [], translationOn: true, nativeLanguage: 'en' };
    expect(await make(200, c).api.fetchKaiChat()).toEqual(c);
    const { api: real, fetchMock } = make(200, { translationOn: false });
    await real.setKaiTranslation(false);
    expect(fetchMock.mock.calls[0]![0].method).toBe('PUT');
    expect(await fetchMock.mock.calls[0]![0].json()).toEqual({ on: false });
    await expect(make(409, { error: 'no_profile' }).api.setKaiTranslation(true)).rejects.toThrow();
  });
});
