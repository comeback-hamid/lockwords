import { fireEvent, render, screen } from '@testing-library/react-native';

import GoalScreen from '@/app/onboarding/goal';
import InterestsScreen from '@/app/onboarding/interests';
import { getAnswers, resetAnswers } from '@/onboarding/store';

const mockRouter = { push: jest.fn(), replace: jest.fn(), back: jest.fn(), canGoBack: () => true };
jest.mock('expo-router', () => ({ useRouter: () => mockRouter, useLocalSearchParams: () => ({}) }));
jest.mock('@/auth/boot', () => ({ api: { saveProfile: jest.fn() } }));
jest.mock('react-native-safe-area-context', () => ({ useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }) }));

const continueButton = () => screen.getByRole('button', { name: 'Continue' });
const isOff = (el: ReturnType<typeof continueButton>) => el.props.accessibilityState?.disabled === true;
const tile = (name: string) => screen.getByRole('checkbox', { name });
const isDisabled = (name: string) => tile(name).props.accessibilityState?.disabled === true;
const isPicked = (name: string) => tile(name).props.accessibilityState?.checked === true;

beforeEach(() => {
  resetAnswers();
  jest.clearAllMocks();
});

describe('O8 Goal · Other (Figma O8b)', () => {
  test('Other shows the YOUR REASON box and needs text', async () => {
    await render(<GoalScreen />);
    expect(screen.queryByText('YOUR REASON')).toBeNull();
    await fireEvent.press(screen.getByRole('radio', { name: 'Other' }));
    expect(screen.getByText('YOUR REASON')).toBeOnTheScreen();
    expect(isOff(continueButton())).toBe(true);
    await fireEvent.changeText(screen.getByLabelText('Your reason'), 'For my grandmother');
    expect(isOff(continueButton())).toBe(false);
    await fireEvent.press(continueButton());
    expect(getAnswers()).toMatchObject({ goal: 'other', goalOther: 'For my grandmother' });
    expect(mockRouter.push).toHaveBeenCalledWith('/onboarding/interests');
  });

  test('leaving Other hides the box', async () => {
    await render(<GoalScreen />);
    await fireEvent.press(screen.getByRole('radio', { name: 'Other' }));
    await fireEvent.press(screen.getByRole('radio', { name: 'Work' }));
    expect(screen.queryByText('YOUR REASON')).toBeNull();
    expect(isOff(continueButton())).toBe(false);
  });
});

describe('O9 Interests: 20 to choose, 1 to 5 picked (Figma O9b)', () => {
  const five = ['Food', 'Travel', 'Music', 'Movies', 'Books'];

  test('20 tiles, none of the dropped ones', async () => {
    await render(<InterestsScreen />);
    expect(screen.getAllByRole('checkbox')).toHaveLength(20);
    for (const gone of ['Cooking', 'Fitness', 'Fashion', 'Gaming']) expect(screen.queryByRole('checkbox', { name: gone })).toBeNull();
  });

  test('the fifth pick locks the rest; a sixth tap does nothing', async () => {
    await render(<InterestsScreen />);
    for (const name of five) await fireEvent.press(tile(name));
    expect(screen.getByText('5 OF 5 PICKED')).toBeOnTheScreen();
    expect(isDisabled('Work')).toBe(true);
    expect(isDisabled('Culture')).toBe(true);
    expect(isDisabled('Food')).toBe(false);
    await fireEvent.press(tile('Work'));
    expect(isPicked('Work')).toBe(false);
    expect(screen.getByText('5 OF 5 PICKED')).toBeOnTheScreen();
    expect(isOff(continueButton())).toBe(false);
  });

  test('unpicking one frees the rest', async () => {
    await render(<InterestsScreen />);
    for (const name of five) await fireEvent.press(tile(name));
    await fireEvent.press(tile('Books'));
    expect(screen.getByText('4 SELECTED')).toBeOnTheScreen();
    expect(isDisabled('Work')).toBe(false);
    await fireEvent.press(tile('Work'));
    expect(isPicked('Work')).toBe(true);
    expect(screen.getByText('5 OF 5 PICKED')).toBeOnTheScreen();
  });
});
