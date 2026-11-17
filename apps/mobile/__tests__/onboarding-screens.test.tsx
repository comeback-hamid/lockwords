import { act, fireEvent, render, screen, waitFor } from '@testing-library/react-native';

import { api } from '@/auth/boot';
import GoalScreen from '@/app/onboarding/goal';
import InterestsScreen from '@/app/onboarding/interests';
import LearningScreen from '@/app/onboarding/learning';
import LevelScreen from '@/app/onboarding/level';
import SpeaksScreen from '@/app/onboarding/speaks';
import WelcomeScreen from '@/app/onboarding/welcome';
import { markOnboardingFinished } from '@/onboarding/finished';
import { getAnswers, resetAnswers, setAnswers } from '@/onboarding/store';

const mockRouter = { push: jest.fn(), replace: jest.fn(), back: jest.fn(), canGoBack: () => true };
let mockParams: Record<string, string> = {};
jest.mock('expo-router', () => ({ useRouter: () => mockRouter, useLocalSearchParams: () => mockParams }));
jest.mock('@/auth/boot', () => ({ api: { fetchWordTest: jest.fn(), fetchEstimate: jest.fn(), saveProfile: jest.fn() } }));
jest.mock('@/onboarding/finished', () => ({ markOnboardingFinished: jest.fn(async () => {}) }));
jest.mock('react-native-safe-area-context', () => ({ useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }) }));

const mockApi = jest.mocked(api);
const spanish = { code: 'es', name: 'Spanish' };
const continueButton = () => screen.getByRole('button', { name: 'Continue' });
const isOff = (el: ReturnType<typeof continueButton>) => el.props.accessibilityState?.disabled === true;

beforeEach(() => {
  resetAnswers();
  mockParams = {};
  jest.clearAllMocks();
});

describe('O1 I’m learning', () => {
  test('pick a listed language, then Continue', async () => {
    await render(<LearningScreen />);
    expect(screen.getByRole('header', { name: 'What do you want to learn?' })).toBeOnTheScreen();
    expect(screen.getByText('1/10')).toBeOnTheScreen();
    expect(isOff(continueButton())).toBe(true);
    await fireEvent.press(screen.getByRole('radio', { name: 'Spanish' }));
    expect(screen.getByRole('radio', { name: 'Spanish' }).props.accessibilityState.checked).toBe(true);
    expect(isOff(continueButton())).toBe(false);
    await fireEvent.press(continueButton());
    expect(getAnswers().learning).toEqual(spanish);
    expect(mockRouter.push).toHaveBeenCalledWith('/onboarding/speaks');
  });

  test('Other needs text (O1b)', async () => {
    await render(<LearningScreen />);
    await fireEvent.press(screen.getByRole('radio', { name: 'Other' }));
    expect(isOff(continueButton())).toBe(true);
    await fireEvent.changeText(screen.getByLabelText('Language name'), 'Swedish');
    expect(isOff(continueButton())).toBe(false);
    await fireEvent.press(continueButton());
    expect(getAnswers().learning).toEqual({ code: null, name: 'Swedish' });
  });

  test('coming back keeps the answer', async () => {
    setAnswers({ learning: spanish });
    await render(<LearningScreen />);
    expect(screen.getByRole('radio', { name: 'Spanish' }).props.accessibilityState.checked).toBe(true);
  });
});

test('O1c I speak lists English, Spanish, Persian, Arabic, Other and goes to Welcome', async () => {
  await render(<SpeaksScreen />);
  expect(screen.getByRole('header', { name: 'What language do you speak?' })).toBeOnTheScreen();
  for (const name of ['English', 'Spanish', 'Persian', 'Arabic', 'Other']) expect(screen.getByRole('radio', { name })).toBeOnTheScreen();
  await fireEvent.press(screen.getByRole('radio', { name: 'Persian' }));
  await fireEvent.press(continueButton());
  expect(getAnswers().speaks).toEqual({ code: 'fa', name: 'Persian' });
  expect(mockRouter.push).toHaveBeenCalledWith('/onboarding/welcome');
});

test('O2 Welcome', async () => {
  await render(<WelcomeScreen />);
  expect(screen.getByText('Your words,\non your lock screen.')).toBeOnTheScreen();
  expect(screen.getByText('Learn a word every time you unlock.')).toBeOnTheScreen();
  await fireEvent.press(screen.getByRole('button', { name: 'Get started' }));
  expect(mockRouter.push).toHaveBeenCalledWith('/onboarding/level');
});

describe('O3 Level', () => {
  beforeEach(() => setAnswers({ learning: spanish }));

  test('title uses the language; five levels with a second line', async () => {
    await render(<LevelScreen />);
    expect(screen.getByRole('header', { name: 'Your Spanish level' })).toBeOnTheScreen();
    expect(screen.getByText('2/10')).toBeOnTheScreen();
    for (const name of ['Brand new', 'Beginner', 'Some basics', 'Intermediate', 'Advanced']) expect(screen.getByRole('radio', { name })).toBeOnTheScreen();
    expect(screen.getByText('I can order food')).toBeOnTheScreen();
  });

  test('Brand new skips the word test', async () => {
    await render(<LevelScreen />);
    await fireEvent.press(screen.getByRole('radio', { name: 'Brand new' }));
    await fireEvent.press(continueButton());
    expect(mockRouter.push).toHaveBeenCalledWith('/onboarding/goal');
  });

  test('other levels go to the word test', async () => {
    await render(<LevelScreen />);
    await fireEvent.press(screen.getByRole('radio', { name: 'Some basics' }));
    await fireEvent.press(continueButton());
    expect(getAnswers().level).toBe('some_basics');
    expect(mockRouter.push).toHaveBeenCalledWith('/onboarding/word-test?page=A');
  });
});

// O4–O7 (word test and estimate) are tested in word-test-screens.test.tsx (vocab engine, 2026-11-17).

test('O8 Goal: seven goals; pick one and continue', async () => {
  await render(<GoalScreen />);
  expect(screen.getByRole('header', { name: 'Why are you learning?' })).toBeOnTheScreen();
  expect(screen.getByText('7/10')).toBeOnTheScreen();
  for (const name of ['Travel', 'Work', 'Move abroad', 'Family & friends', 'Keep my brain active', 'School', 'Other']) expect(screen.getByRole('radio', { name })).toBeOnTheScreen();
  expect(isOff(continueButton())).toBe(true);
  await fireEvent.press(screen.getByRole('radio', { name: 'Travel' }));
  await fireEvent.press(continueButton());
  expect(getAnswers().goal).toBe('travel');
  expect(mockRouter.push).toHaveBeenCalledWith('/onboarding/interests');
});

describe('O9 Interests', () => {
  beforeEach(() => setAnswers({ learning: spanish, speaks: { code: 'en', name: 'English' }, level: 'brand_new', goal: 'travel' }));

  test('24 tiles; select and count; save; then the Kai chat', async () => {
    mockApi.saveProfile.mockImplementation(async (p) => p);
    await render(<InterestsScreen />);
    expect(screen.getByRole('header', { name: 'What are you into?' })).toBeOnTheScreen();
    expect(screen.getByText('8/10')).toBeOnTheScreen();
    expect(screen.getAllByRole('checkbox')).toHaveLength(24);
    expect(isOff(continueButton())).toBe(true);
    await fireEvent.press(screen.getByRole('checkbox', { name: 'Food' }));
    await fireEvent.press(screen.getByRole('checkbox', { name: 'Music' }));
    expect(screen.getByText('2 SELECTED')).toBeOnTheScreen();
    await fireEvent.press(continueButton());
    await waitFor(() => expect(mockRouter.push).toHaveBeenCalledWith('/onboarding/kai'));
    expect(mockApi.saveProfile).toHaveBeenCalledWith({
      learningLanguage: 'es', nativeLanguage: 'en', level: 'brand_new', knownWords: null, cefr: null, goal: 'travel', goalOther: null, interests: ['food', 'music'],
    });
    expect(markOnboardingFinished).not.toHaveBeenCalled(); // onboarding ends after the first deck (Kai chat)
  });

  test('save fails: stays here with a message, and Continue tries again', async () => {
    mockApi.saveProfile.mockRejectedValueOnce(new Error('offline')).mockImplementation(async (p) => p);
    await render(<InterestsScreen />);
    await fireEvent.press(screen.getByRole('checkbox', { name: 'News' }));
    await fireEvent.press(continueButton());
    await waitFor(() => expect(screen.getByText('Could not save. Try again.')).toBeOnTheScreen());
    expect(mockRouter.push).not.toHaveBeenCalled();
    await fireEvent.press(continueButton());
    await waitFor(() => expect(mockRouter.push).toHaveBeenCalledWith('/onboarding/kai'));
  });
});
