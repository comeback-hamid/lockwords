import { act, fireEvent, render, renderHook, screen, waitFor, within } from '@testing-library/react-native';
import { AppState, Keyboard } from 'react-native';

import type { KaiChat, KaiMessage, KaiWord, ReviewCard } from '@/api/client';
import NewWordsScreen from '@/app/(tabs)/index';
import KaiScreen from '@/app/onboarding/kai';
import UseItScreen from '@/app/use-it/[id]';
import { api } from '@/auth/boot';
import { ChatBubble } from '@/components/chat/chat-bubble';
import { Composer } from '@/components/chat/composer';
import { KaiText } from '@/components/chat/kai-text';
import { useScrollToEndOnKeyboard } from '@/components/chat/keyboard';
import { WordCard } from '@/components/chat/word-card';
import { TextField } from '@/components/text-field';
import { ENGLISH_SCRIPT } from '@/onboarding/kai-script';
import { resetAnswers, setAnswers } from '@/onboarding/store';
import { setRound } from '@/review/round-store';
import { type } from '@/theme/theme';

// One translation switch for every chat, and the keyboard rules (Hamid's phone test, 2026-11-23).

jest.mock('expo-router', () => ({
  useRouter: () => ({ push: jest.fn(), replace: jest.fn(), back: jest.fn(), navigate: jest.fn(), canGoBack: () => true }),
  useLocalSearchParams: () => ({ id: 'c1' }),
  useFocusEffect: (effect: () => (() => void) | void) => {
    const { useEffect } = jest.requireActual<typeof import('react')>('react');
    useEffect(() => effect(), [effect]);
  },
}));
jest.mock('@/auth/me-store', () => ({ useMe: () => ({ id: 'user-1', isGuest: true, createdAt: '' }) }));
jest.mock('@/auth/boot', () => ({
  api: {
    fetchKaiChat: jest.fn(),
    openKaiChat: jest.fn(),
    sendKaiMessage: jest.fn(),
    setKaiTranslation: jest.fn(),
    fetchKaiScript: jest.fn(),
    saveChat: jest.fn(),
    fetchDeckIdeas: jest.fn(),
    proposeDeck: jest.fn(),
    generateDeck: jest.fn(),
    kaiReply: jest.fn(),
    useIt: jest.fn(),
    askAboutWord: jest.fn(),
  },
}));
jest.mock('@/onboarding/finished', () => ({ markOnboardingFinished: jest.fn(async () => {}) }));
jest.mock('react-native-safe-area-context', () => ({ useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }) }));

const mockApi = jest.mocked(api);
const inLang = (tag: string) => Object.fromEntries(Object.entries(ENGLISH_SCRIPT).map(([k, v]) => [k, `${tag} ${v}`]));
const FA = { ...inLang('فا'), 'idea:Ordering food': 'فا سفارش غذا' };
const ES = { ...inLang('ES'), 'idea:Ordering food': 'ES Ordering food' };
const chat = (over: Partial<KaiChat> = {}): KaiChat => ({ messages: [], options: [], translationOn: true, nativeLanguage: 'fa', ...over });
const kaiLine = (text: string, translation: string | null): KaiMessage => ({ id: `k-${text}`, from: 'kai', text, translation, createdAt: '2026-11-23T10:00:00.000Z' });
const NOTHING = { ok: true as const, turn: { userMessage: null, messages: [], options: [], action: null } };
const kaiSays = (text: string) => screen.getByLabelText(`Kai: ${text}`);
const send = async (text: string) => {
  await fireEvent.changeText(screen.getByLabelText('Message'), text);
  await fireEvent.press(screen.getByRole('button', { name: 'Send' }));
};
const card: ReviewCard = { id: 'c1', deckId: 'd1', deckTopic: 'Food', word: 'la propina', translation: 'the tip', example: 'Dejo una propina.', exampleTranslation: 'I leave a tip.', stage: 1, canUseIt: true };

let dismiss: jest.SpyInstance;
beforeEach(() => {
  jest.clearAllMocks();
  resetAnswers();
  dismiss = jest.spyOn(Keyboard, 'dismiss').mockImplementation(() => {});
  jest.spyOn(AppState, 'addEventListener').mockImplementation(() => ({ remove: jest.fn() }) as never);
  mockApi.fetchKaiChat.mockResolvedValue(chat());
  mockApi.openKaiChat.mockResolvedValue(NOTHING);
  mockApi.sendKaiMessage.mockResolvedValue(NOTHING);
  mockApi.setKaiTranslation.mockResolvedValue(undefined);
  mockApi.saveChat.mockImplementation(async (c) => c);
  mockApi.fetchDeckIdeas.mockResolvedValue(['Ordering food']);
  mockApi.fetchKaiScript.mockResolvedValue({ native: FA, learning: ES });
  mockApi.kaiReply.mockRejectedValue(new Error('no kai')); // typed text is taken as the answer
});
afterEach(() => jest.restoreAllMocks());

// A Persian speaker who learns Spanish, up to the picked chat language.
async function onboardingChat(pick: 'Español' | 'فارسی' | null = 'Español') {
  setAnswers({ learning: { code: 'es', name: 'Spanish' }, speaks: { code: 'fa', name: 'Persian' } });
  await render(<KaiScreen />);
  await waitFor(() => expect(kaiSays('فا I’ll help you learn Spanish words. What’s your name?')).toBeOnTheScreen());
  if (!pick) return;
  await send('Sara');
  await waitFor(() => expect(screen.getByRole('button', { name: pick })).toBeOnTheScreen());
  await fireEvent.press(screen.getByRole('button', { name: pick }));
  await waitFor(() => expect(screen.getByRole('button', { name: /Ordering food|سفارش غذا/ })).toBeOnTheScreen());
}

describe('the translation switch in the onboarding chat', () => {
  test('it is there from Kai’s first line, with the code of the learner’s own language', async () => {
    await onboardingChat(null);
    expect(screen.getByRole('switch', { name: 'Translation, on' })).toBeOnTheScreen();
    expect(screen.getByText('FA')).toBeOnTheScreen();
  });

  test('on: a line in the learned language has a divider and the own-language line under it; off hides them and is saved', async () => {
    await onboardingChat();
    expect(kaiSays('ES Here’s what I do ✨')).toBeOnTheScreen();
    expect(screen.getByText('فا Here’s what I do ✨')).toBeOnTheScreen();
    expect(screen.getAllByTestId('translation-divider').length).toBeGreaterThan(0);
    await fireEvent.press(screen.getByRole('switch', { name: 'Translation, on' }));
    expect(screen.queryByText('فا Here’s what I do ✨')).toBeNull();
    expect(screen.queryByTestId('translation-divider')).toBeNull();
    expect(kaiSays('ES Here’s what I do ✨')).toBeOnTheScreen();
    expect(mockApi.setKaiTranslation).toHaveBeenCalledWith(false);
    await fireEvent.press(screen.getByRole('switch', { name: 'Translation, off' }));
    expect(screen.getByText('فا Here’s what I do ✨')).toBeOnTheScreen();
    expect(mockApi.setKaiTranslation).toHaveBeenLastCalledWith(true);
  });

  test('it starts as the learner left it (the same saved choice as the New words chat)', async () => {
    mockApi.fetchKaiChat.mockResolvedValue(chat({ translationOn: false }));
    await onboardingChat();
    expect(screen.getByRole('switch', { name: 'Translation, off' })).toBeOnTheScreen();
    expect(screen.queryByText('فا Here’s what I do ✨')).toBeNull();
  });

  test('a line Kai says in the learner’s own language has nothing under it', async () => {
    await onboardingChat('فارسی');
    expect(screen.getByRole('switch', { name: 'Translation, on' })).toBeOnTheScreen();
    expect(kaiSays('فا Here’s what I do ✨')).toBeOnTheScreen();
    expect(screen.queryByTestId('translation-divider')).toBeNull();
  });

  test('Kai’s own answer to typed text comes with its translation too', async () => {
    await onboardingChat();
    mockApi.kaiReply.mockResolvedValueOnce({ onScript: false, lines: ['😊 Hago **tarjetas** contigo.'], translations: ['😊 با تو کارت می‌سازم.'] });
    await send('¿Qué haces?');
    expect(mockApi.kaiReply).toHaveBeenLastCalledWith('topic', '¿Qué haces?', expect.any(Array), 'target');
    await waitFor(() => expect(kaiSays('😊 Hago tarjetas contigo.')).toBeOnTheScreen());
    expect(screen.getByText('😊 با تو کارت می‌سازم.')).toBeOnTheScreen();
  });
});

describe('one bubble rule for every chat', () => {
  test('a translation that says the same as the line is not shown twice', async () => {
    await render(<ChatBubble from="kai" text="Hi **Maya**! 👋" translation="Hi Maya! 👋" showTranslation />);
    expect(screen.queryByTestId('translation-divider')).toBeNull();
    expect(screen.getAllByText(/Hi/).length).toBe(1);
  });

  test('New words: the switch works the same way (on shows, off hides, the choice is saved)', async () => {
    mockApi.fetchKaiChat.mockResolvedValue(chat({ messages: [kaiLine('¡Hola!', 'سلام!')] }));
    await render(<NewWordsScreen />);
    await waitFor(() => expect(screen.getByText('سلام!')).toBeOnTheScreen());
    expect(screen.getByText('FA')).toBeOnTheScreen();
    await fireEvent.press(screen.getByRole('switch', { name: 'Translation, on' }));
    expect(screen.queryByText('سلام!')).toBeNull();
    expect(mockApi.setKaiTranslation).toHaveBeenCalledWith(false);
  });
});

describe('the keyboard', () => {
  test('Return in the chat box sends the text and closes the keyboard', async () => {
    const onSend = jest.fn();
    await render(<Composer placeholder="Type a message…" onSend={onSend} />);
    await fireEvent.changeText(screen.getByLabelText('Message'), 'Hola');
    await fireEvent(screen.getByLabelText('Message'), 'submitEditing');
    expect(onSend).toHaveBeenCalledWith('Hola');
    expect(dismiss).toHaveBeenCalled();
  });

  test('Return in an empty chat box closes the keyboard too', async () => {
    await render(<Composer placeholder="Type a message…" onSend={jest.fn()} />);
    await fireEvent(screen.getByLabelText('Message'), 'submitEditing');
    expect(dismiss).toHaveBeenCalled();
  });

  test('Return in a text box of a question screen closes the keyboard', async () => {
    await render(<TextField label="Your reason" accessibilityLabel="Your reason" value="" onChangeText={jest.fn()} />);
    expect(screen.getByLabelText('Your reason').props.returnKeyType).toBe('done');
    await fireEvent(screen.getByLabelText('Your reason'), 'submitEditing');
    expect(dismiss).toHaveBeenCalled();
  });

  const dragCloses = async () => {
    const messages = screen.getByTestId('chat-messages');
    expect(messages.props.keyboardDismissMode).toBe('on-drag');
    expect(dismiss).not.toHaveBeenCalled();
    await fireEvent(messages, 'scrollBeginDrag');
    expect(dismiss).toHaveBeenCalled();
  };

  test('onboarding chat: a scroll of the messages closes the keyboard', async () => {
    await onboardingChat(null);
    await dragCloses();
  });

  test('New words chat: a scroll of the messages closes the keyboard', async () => {
    await render(<NewWordsScreen />);
    await waitFor(() => expect(screen.getByTestId('chat-messages')).toBeOnTheScreen());
    await dragCloses();
  });

  test('Use it chat: a scroll of the messages closes the keyboard', async () => {
    setRound([card]);
    await render(<UseItScreen />);
    await act(async () => {});
    await dragCloses();
  });
});

// Hamid, 2026-11-23: **word** must be bold with no stars, everywhere Kai's or the server's text shows.
describe('bold words (**word**), one renderer', () => {
  const bold = (text: string) => screen.getByText(text).props.style;
  const fonts = (style: unknown) => JSON.stringify(style);

  test('KaiText: the marked word is bold and the stars are gone', async () => {
    await render(<KaiText text="I make **decks** for **you**" style={type.body} boldStyle={type.bodyStrong} />);
    expect(screen.getByText('I make decks for you')).toBeOnTheScreen();
    expect(screen.queryByText(/\*/)).toBeNull();
    expect(fonts(bold('decks'))).toContain(type.bodyStrong.fontFamily);
    expect(fonts(bold('you'))).toContain(type.bodyStrong.fontFamily);
  });

  test('KaiText: a single pair of stars with no partner is taken out and nothing turns bold', async () => {
    await render(<KaiText text="Tap **Generate now" style={type.body} boldStyle={type.bodyStrong} />);
    expect(screen.getByText('Tap Generate now')).toBeOnTheScreen();
    expect(screen.queryByText(/\*/)).toBeNull();
  });

  test('the translation under the divider: bold word, no stars', async () => {
    await render(<ChatBubble from="kai" text="Creo **mazos** para ti" translation="برات **دسته** می‌سازم" showTranslation />);
    expect(screen.getByText('برات دسته می‌سازم')).toBeOnTheScreen();
    expect(screen.queryByText(/\*/)).toBeNull();
    expect(fonts(bold('دسته'))).toContain(type.captionStrong.fontFamily);
    expect(fonts(bold('mazos'))).toContain(type.bodyStrong.fontFamily);
  });

  test('onboarding chat in the learned language: no stars in a line or under it', async () => {
    await onboardingChat();
    expect(kaiSays('ES 🃏 I make decks of words just for you')).toBeOnTheScreen();
    expect(screen.getByText('فا 🃏 I make decks of words just for you')).toBeOnTheScreen();
    expect(screen.queryByText(/\*/)).toBeNull();
  });

  test('word card: stars in the example translation or the meaning do not show', async () => {
    const word: KaiWord = { word: 'la propina', translation: 'the **tip**', example: 'Dejo una **propina**.', exampleTranslation: 'I leave a **tip**.', addTo: 'Random Words 1', added: false, already: false };
    await render(<WordCard word={word} onAdd={jest.fn()} />);
    expect(screen.queryByText(/\*/)).toBeNull();
    expect(screen.getByText('I leave a tip.')).toBeOnTheScreen();
    expect(screen.getByTestId('example-word')).toHaveTextContent('propina');
  });
});

// Hamid, 2026-11-23: the reply options are the last item of the chat, not a block glued on top of the keyboard.
describe('reply options are part of the message list', () => {
  const inList = (name: string) => within(screen.getByTestId('chat-messages')).getByRole('button', { name });

  test('onboarding chat', async () => {
    await onboardingChat(null);
    await send('Sara');
    await waitFor(() => expect(inList('Español')).toBeOnTheScreen());
    expect(inList('فارسی')).toBeOnTheScreen();
  });

  test('New words chat', async () => {
    mockApi.fetchKaiChat.mockResolvedValue(chat({ messages: [kaiLine('¿Practicamos?', 'تمرین کنیم؟')], options: ['Vamos a practicar'] }));
    await render(<NewWordsScreen />);
    await waitFor(() => expect(inList('Vamos a practicar')).toBeOnTheScreen());
  });

  test('Use it chat', async () => {
    setRound([card]);
    await render(<UseItScreen />);
    await waitFor(() => expect(inList('Show me an example')).toBeOnTheScreen());
  });

  test('when the keyboard opens, the chat scrolls to its end, so the options stay in view', async () => {
    const shown: (() => void)[] = [];
    jest.spyOn(Keyboard, 'addListener').mockImplementation(((event: string, fn: () => void) => {
      if (event === 'keyboardDidShow') shown.push(fn);
      return { remove: jest.fn() };
    }) as never);
    const scrollToEnd = jest.fn();
    await renderHook(() => useScrollToEndOnKeyboard({ current: { scrollToEnd } }));
    expect(shown.length).toBe(1);
    act(() => shown[0]!());
    expect(scrollToEnd).toHaveBeenCalledWith({ animated: true });
  });
});
