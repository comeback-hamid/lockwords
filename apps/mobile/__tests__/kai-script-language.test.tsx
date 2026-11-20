import { act, fireEvent, render, screen, waitFor } from '@testing-library/react-native';

import KaiScreen from '@/app/onboarding/kai';
import { api } from '@/auth/boot';
import { ENGLISH_SCRIPT, makeScript, SCRIPT_WAIT_MS } from '@/onboarding/kai-script';
import { resetAnswers, setAnswers } from '@/onboarding/store';

jest.mock('expo-router', () => ({ useRouter: () => ({ push: jest.fn(), replace: jest.fn(), back: jest.fn(), canGoBack: () => true }), useLocalSearchParams: () => ({}) }));
jest.mock('@/auth/boot', () => ({ api: { fetchKaiScript: jest.fn(), saveChat: jest.fn(), fetchDeckIdeas: jest.fn(), proposeDeck: jest.fn(), generateDeck: jest.fn(), kaiReply: jest.fn() } }));
jest.mock('@/onboarding/finished', () => ({ markOnboardingFinished: jest.fn(async () => {}) }));
jest.mock('react-native-safe-area-context', () => ({ useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }) }));

const mockApi = jest.mocked(api);
const inLang = (tag: string) => Object.fromEntries(Object.entries(ENGLISH_SCRIPT).map(([k, v]) => [k, `${tag} ${v}`]));
const FA = { ...inLang('فا'), 'idea:Ordering food': 'فا سفارش غذا' };
const ES = { ...inLang('ES'), 'idea:Ordering food': 'ES Ordering food' };
const kaiSays = (text: string) => screen.getByLabelText(`Kai: ${text}`);
const send = async (text: string) => {
  await fireEvent.changeText(screen.getByLabelText('Message'), text);
  await fireEvent.press(screen.getByRole('button', { name: 'Send' }));
};

beforeEach(() => {
  jest.clearAllMocks();
  resetAnswers();
  mockApi.saveChat.mockImplementation(async (c) => c);
  mockApi.fetchDeckIdeas.mockResolvedValue(['Ordering food', 'At the hotel']);
  mockApi.kaiReply.mockRejectedValue(new Error('no kai')); // typed text is taken as the answer
});

describe('makeScript', () => {
  test('no loaded script: English, no translation', () => {
    const s = makeScript(null, null);
    expect(s.line('askName', { language: 'Spanish' })).toEqual({ text: 'I’ll help you learn **Spanish** words. What’s your name?' });
    expect(s.label('replyPractice')).toBe('OK, let’s practice!');
    expect(s.label('idea:Ordering food')).toBe('Ordering food');
    expect(s.label('idea:Something new')).toBe('Something new'); // an idea the script does not know stays as it is
  });
  test('own language until the chat language is picked, and after "native"', () => {
    expect(makeScript({ native: FA, learning: ES }, null).line('hi')).toEqual({ text: 'فا Hi! I’m Kai 👋' });
    expect(makeScript({ native: FA, learning: ES }, 'native').line('niceToMeet', { name: 'Sara' })).toEqual({ text: 'فا Nice to meet you, **Sara**! 😊' });
  });
  test('"target": the learned language, with the own-language line as its translation', () => {
    const s = makeScript({ native: FA, learning: ES }, 'target');
    expect(s.line('practice')).toEqual({ text: 'ES Shall we practice them now? 💪', translation: 'فا Shall we practice them now? 💪' });
    expect(s.label('replyPractice')).toBe('ES OK, let’s practice!');
  });
  test('the same text in both languages needs no translation line', () => {
    expect(makeScript({ native: ENGLISH_SCRIPT, learning: ENGLISH_SCRIPT }, 'target').line('hi')).toEqual({ text: 'Hi! I’m Kai 👋' });
  });
});

describe('Kai chat', () => {
  test('a Persian speaker: Kai’s first lines are in Persian; after picking Spanish, lines are Spanish with Persian under them', async () => {
    setAnswers({ learning: { code: 'es', name: 'Spanish' }, speaks: { code: 'fa', name: 'Persian' } });
    mockApi.fetchKaiScript.mockResolvedValue({ native: FA, learning: ES });
    await render(<KaiScreen />);
    await waitFor(() => expect(kaiSays('فا Hi! I’m Kai 👋')).toBeOnTheScreen());
    expect(mockApi.fetchKaiScript).toHaveBeenCalledWith('Persian', 'Spanish');
    await waitFor(() => expect(kaiSays('فا I’ll help you learn Spanish words. What’s your name?')).toBeOnTheScreen());
    await send('Sara');
    await waitFor(() => expect(kaiSays('فا Which language should we chat in?')).toBeOnTheScreen());
    await fireEvent.press(screen.getByRole('button', { name: 'Español' }));
    await waitFor(() => expect(kaiSays('ES Here’s what I do ✨')).toBeOnTheScreen());
    expect(screen.getByText('فا Here’s what I do ✨')).toBeOnTheScreen(); // the translation line
    // The deck ideas are tap answers in the chat language
    await waitFor(() => expect(screen.getByRole('button', { name: 'ES Ordering food' })).toBeOnTheScreen());
  });

  test('a Persian speaker who picks Persian keeps Persian, with no translation line', async () => {
    setAnswers({ learning: { code: 'es', name: 'Spanish' }, speaks: { code: 'fa', name: 'Persian' } });
    mockApi.fetchKaiScript.mockResolvedValue({ native: FA, learning: ES });
    await render(<KaiScreen />);
    await waitFor(() => expect(kaiSays('فا Hi! I’m Kai 👋')).toBeOnTheScreen());
    await send('Sara');
    await waitFor(() => expect(screen.getByRole('button', { name: 'فارسی' })).toBeOnTheScreen());
    await fireEvent.press(screen.getByRole('button', { name: 'فارسی' }));
    await waitFor(() => expect(kaiSays('فا Here’s what I do ✨')).toBeOnTheScreen());
    expect(screen.queryByText('ES Here’s what I do ✨')).toBeNull();
    await waitFor(() => expect(screen.getByRole('button', { name: 'فا سفارش غذا' })).toBeOnTheScreen());
  });

  test('an English speaker chatting in English: the English lines, and no script call', async () => {
    setAnswers({ learning: { code: 'es', name: 'Spanish' }, speaks: { code: 'en', name: 'English' } });
    await render(<KaiScreen />);
    await waitFor(() => expect(kaiSays('Hi! I’m Kai 👋')).toBeOnTheScreen());
    await send('Maya');
    await waitFor(() => expect(screen.getByRole('button', { name: 'English' })).toBeOnTheScreen());
    await fireEvent.press(screen.getByRole('button', { name: 'English' }));
    await waitFor(() => expect(kaiSays('Here’s what I do ✨')).toBeOnTheScreen());
    expect(mockApi.fetchKaiScript).not.toHaveBeenCalled();
  });

  test('an English speaker who picks the learned language gets it, with English under it', async () => {
    setAnswers({ learning: { code: 'es', name: 'Spanish' }, speaks: { code: 'en', name: 'English' } });
    mockApi.fetchKaiScript.mockResolvedValue({ native: ENGLISH_SCRIPT, learning: ES });
    await render(<KaiScreen />);
    await waitFor(() => expect(kaiSays('Hi! I’m Kai 👋')).toBeOnTheScreen());
    await send('Maya');
    await waitFor(() => expect(screen.getByRole('button', { name: 'Español' })).toBeOnTheScreen());
    await fireEvent.press(screen.getByRole('button', { name: 'Español' }));
    await waitFor(() => expect(kaiSays('ES Here’s what I do ✨')).toBeOnTheScreen());
    expect(mockApi.fetchKaiScript).toHaveBeenCalledWith('English', 'Spanish');
    expect(screen.getByText('Here’s what I do ✨')).toBeOnTheScreen();
  });

  test('the script call fails: English lines', async () => {
    setAnswers({ learning: { code: 'es', name: 'Spanish' }, speaks: { code: 'fa', name: 'Persian' } });
    mockApi.fetchKaiScript.mockRejectedValue(new Error('down'));
    await render(<KaiScreen />);
    await waitFor(() => expect(kaiSays('Hi! I’m Kai 👋')).toBeOnTheScreen());
  });

  test('the script call is slow: after the wait the chat starts in English', async () => {
    jest.useFakeTimers();
    try {
      setAnswers({ learning: { code: 'es', name: 'Spanish' }, speaks: { code: 'fa', name: 'Persian' } });
      mockApi.fetchKaiScript.mockReturnValue(new Promise(() => {}));
      await render(<KaiScreen />);
      expect(screen.queryByLabelText('Kai: Hi! I’m Kai 👋')).toBeNull();
      await act(async () => {
        jest.advanceTimersByTime(SCRIPT_WAIT_MS + 3000);
      });
      expect(kaiSays('Hi! I’m Kai 👋')).toBeOnTheScreen();
    } finally {
      jest.useRealTimers();
    }
  });
});
