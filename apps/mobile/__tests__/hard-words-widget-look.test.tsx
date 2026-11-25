import { render, screen, waitFor } from '@testing-library/react-native';

import HardWordsIntro from '@/app/intro/hard-words';
import { api } from '@/auth/boot';
import { setRound } from '@/review/round-store';

// O14 shows the lock screen widget as it really looks: the word, its meaning and five squares for the looks.
jest.mock('expo-router', () => ({ useRouter: () => ({ push: jest.fn(), back: jest.fn() }) }));
jest.mock('@/auth/boot', () => ({ api: { fetchHardWords: jest.fn() } }));
jest.mock('react-native-safe-area-context', () => ({ useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }) }));

beforeEach(() => setRound([]));

test('the phone shows the first hard word as the widget would: word, meaning, the first of five squares', async () => {
  jest.mocked(api).fetchHardWords.mockResolvedValue([
    { word: 'la cuenta', translation: 'the bill' },
    { word: 'la propina', translation: 'the tip' },
  ]);
  await render(<HardWordsIntro />);
  await waitFor(() => expect(screen.getByText('YOUR HARD WORDS · 2')).toBeOnTheScreen());
  const widget = screen.getByTestId('lock-widget');
  expect(widget).toHaveTextContent(/la cuenta/);
  expect(widget).toHaveTextContent(/the bill/);
  expect(screen.getByLabelText('Look 1 of 5')).toBeOnTheScreen();
  expect(screen.queryByText('LOCKWORDS')).toBeNull(); // the old card label is gone
});

test('it says how to add the widget', async () => {
  jest.mocked(api).fetchHardWords.mockResolvedValue([]);
  await render(<HardWordsIntro />);
  await waitFor(() => expect(screen.getByText('Hold your lock screen, tap Customize, then add Lockwords.')).toBeOnTheScreen());
});
