import { fireEvent, render, screen, waitFor } from '@testing-library/react-native';

import type { ReviewCard } from '@/api/client';
import UseItScreen from '@/app/use-it/[id]';
import { api } from '@/auth/boot';
import { setRound } from '@/review/round-store';

// Hamid, 2026-11-25: every Kai chat has the translation switch, with the same behavior. Use it had none.
jest.mock('expo-router', () => ({ Stack: { Screen: () => null }, useRouter: () => ({ push: jest.fn(), replace: jest.fn(), back: jest.fn() }), useLocalSearchParams: () => ({ id: 'c1' }) }));
jest.mock('@/auth/boot', () => ({ api: { useIt: jest.fn(), askAboutWord: jest.fn(), fetchUseItScript: jest.fn(), fetchKaiChat: jest.fn(), setKaiTranslation: jest.fn() } }));
jest.mock('react-native-safe-area-context', () => ({ useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }) }));

const mockApi = jest.mocked(api);
const card: ReviewCard = { id: 'c1', deckId: 'd1', deckTopic: 'Work', word: 'deadline', translation: 'مهلت', example: 'The deadline is Friday.', exampleTranslation: 'مهلت جمعه است.', stage: 0, canUseIt: true };
const line = (text: string, translation?: string) => ({ text, ...(translation ? { translation } : {}) });
const script = {
  nativeLanguage: 'Persian',
  lines: {
    useItIntro: line('Time to use a word! ✍️', 'وقت استفاده از یک کلمه است! ✍️'),
    useItWrite: line('Write one sentence with **{word}**. I’ll check it for you.', 'یک جمله با **{word}** بنویس. من بررسی می‌کنم.'),
    useItChecking: line('Checking… 👀'),
    useItThinking: line('Thinking… 💭'),
    useItCheckFailed: line('I could not check that. Try again.'),
    useItAskFailed: line('I could not answer that. Try again.'),
    replyExample: line('Show me an example'),
    replySkip: line('Skip this word'),
    replyNext: line('Next card'),
  },
};

beforeEach(() => {
  jest.clearAllMocks();
  setRound([card]);
  mockApi.fetchUseItScript.mockResolvedValue(script);
  mockApi.fetchKaiChat.mockResolvedValue({ messages: [], options: [], translationOn: true, nativeLanguage: 'Persian' } as never);
  mockApi.setKaiTranslation.mockResolvedValue(undefined as never);
});

test('Use it has the translation switch: on shows the learner’s language under Kai’s lines, off hides it, and the choice is saved', async () => {
  mockApi.useIt.mockResolvedValue({ good: true, lines: ['🎉 **Great sentence!**'], translations: ['🎉 **جمله عالی بود!**'], movedUp: false, stage: 0, followUp: null });
  await render(<UseItScreen />);
  await waitFor(() => expect(screen.getByRole('switch', { name: 'Translation, on' })).toBeOnTheScreen());
  expect(screen.getByText(/وقت استفاده از یک کلمه است/)).toBeOnTheScreen();
  expect(screen.getByText(/یک جمله با/)).toBeOnTheScreen(); // the word is put into the translation too

  await fireEvent.changeText(screen.getByLabelText('Message'), 'The deadline is tomorrow.');
  await fireEvent.press(screen.getByRole('button', { name: 'Send' }));
  await waitFor(() => expect(screen.getByText(/جمله عالی بود/)).toBeOnTheScreen());

  await fireEvent.press(screen.getByRole('switch', { name: 'Translation, on' }));
  expect(screen.getByRole('switch', { name: 'Translation, off' })).toBeOnTheScreen();
  expect(screen.queryByText(/جمله عالی بود/)).toBeNull();
  expect(screen.queryByText(/وقت استفاده از یک کلمه است/)).toBeNull();
  expect(mockApi.setKaiTranslation).toHaveBeenCalledWith(false);
});

test('the example comes with its translation under it', async () => {
  await render(<UseItScreen />);
  await waitFor(() => expect(screen.getByRole('button', { name: 'Show me an example' })).toBeOnTheScreen());
  await fireEvent.press(screen.getByRole('button', { name: 'Show me an example' }));
  await waitFor(() => expect(screen.getByText('مهلت جمعه است.')).toBeOnTheScreen());
});

test('the lines cannot be loaded: the chat still works in English, with no switch', async () => {
  mockApi.fetchUseItScript.mockRejectedValue(new Error('down'));
  await render(<UseItScreen />);
  await waitFor(() => expect(screen.getByLabelText('Kai: Time to use a word! ✍️')).toBeOnTheScreen());
  expect(screen.queryByRole('switch')).toBeNull();
});
