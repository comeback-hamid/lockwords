import { fireEvent, render, screen } from '@testing-library/react-native';

import type { ReviewCard } from '@/api/client';
import RoundScreen from '@/app/review/round';
import { setRound } from '@/review/round-store';

jest.mock('expo-router', () => ({ Stack: { Screen: () => null }, useRouter: () => ({ push: jest.fn(), replace: jest.fn(), back: jest.fn() }) }));
jest.mock('@/auth/boot', () => ({ api: {} }));
jest.mock('@/review/intro', () => ({ isIntroDone: jest.fn(async () => true) }));
jest.mock('@/review/streak', () => ({ streakToShow: jest.fn(async () => null) }));
jest.mock('expo-speech', () => ({ speak: jest.fn(), stop: jest.fn() }));
jest.mock('react-native-safe-area-context', () => ({ useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }) }));

const card = (over: Partial<ReviewCard> = {}): ReviewCard => ({ id: 'c1', deckId: 'd1', deckTopic: 'Cooking', word: 'la sazón', translation: 'the seasoning', example: 'Mi abuela tiene muy buena sazón.', exampleTranslation: 'My grandmother’s cooking has great flavor.', stage: 0, canUseIt: true, ...over });

test('a card with a meaning shows it on the back, in place of the translation (Figma O12c)', async () => {
  setRound([card({ meaning: 'El sabor que alguien le da a la comida.' })]);
  await render(<RoundScreen />);
  await fireEvent.press(screen.getByTestId('review-card'));
  expect(screen.getByText('El sabor que alguien le da a la comida.')).toBeOnTheScreen();
  expect(screen.queryByText('the seasoning')).toBeNull();
  expect(screen.getByText('My grandmother’s cooking has great flavor.')).toBeOnTheScreen(); // the example keeps its translation
});

test('a card without a meaning shows the translation', async () => {
  setRound([card()]);
  await render(<RoundScreen />);
  await fireEvent.press(screen.getByTestId('review-card'));
  expect(screen.getByText('the seasoning')).toBeOnTheScreen();
});
