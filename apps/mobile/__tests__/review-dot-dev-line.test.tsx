import { act, render, screen } from '@testing-library/react-native';

import NewWordsScreen from '@/app/(tabs)/index';
import { api } from '@/auth/boot';
import { clearReviewDot, showReviewDot } from '@/review/dot';

jest.mock('expo-router', () => ({
  useRouter: () => ({ push: jest.fn(), replace: jest.fn(), back: jest.fn(), navigate: jest.fn() }),
  useFocusEffect: (effect: () => (() => void) | void) => {
    const { useEffect } = jest.requireActual<typeof import('react')>('react');
    useEffect(() => effect(), [effect]);
  },
}));
jest.mock('@/auth/me-store', () => ({ useMe: () => ({ id: 'user-1', isGuest: true, createdAt: '' }) }));
jest.mock('@/auth/boot', () => ({ api: { fetchKaiChat: jest.fn(), openKaiChat: jest.fn(), sendKaiMessage: jest.fn(), setKaiTranslation: jest.fn() } }));
jest.mock('react-native-safe-area-context', () => ({ useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }) }));

const mockApi = jest.mocked(api);

// The Review tab's red dot is a native badge that Maestro cannot see. Dev builds say the same thing in a line of text.
test('dev builds say whether the Review dot is on, and follow it', async () => {
  mockApi.fetchKaiChat.mockResolvedValue({ messages: [], options: [], translationOn: true, nativeLanguage: 'en' } as never);
  mockApi.openKaiChat.mockResolvedValue({ ok: true, turn: { userMessage: null, messages: [], options: [], action: null } } as never);
  await act(async () => void (await clearReviewDot()));
  await render(<NewWordsScreen />);
  await act(async () => {});
  expect(screen.getByTestId('dev-review-dot')).toHaveTextContent('review dot off');
  await act(async () => void (await showReviewDot()));
  expect(screen.getByTestId('dev-review-dot')).toHaveTextContent('review dot on');
  await act(async () => void (await clearReviewDot()));
  expect(screen.getByTestId('dev-review-dot')).toHaveTextContent('review dot off');
});
