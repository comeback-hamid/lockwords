import { act, fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import { Alert, Keyboard } from 'react-native';

import { api } from '@/auth/boot';
import EstimateScreen from '@/app/onboarding/estimate';
import GoalScreen from '@/app/onboarding/goal';
import InterestsScreen from '@/app/onboarding/interests';
import LearningScreen from '@/app/onboarding/learning';
import LevelScreen from '@/app/onboarding/level';
import SpeaksScreen from '@/app/onboarding/speaks';
import WelcomeScreen from '@/app/onboarding/welcome';
import WordTestScreen from '@/app/onboarding/word-test';
import { markOnboardingFinished } from '@/onboarding/finished';
import { getAnswers, resetAnswers, setAnswers } from '@/onboarding/store';

const mockRouter = { push: jest.fn(), replace: jest.fn(), back: jest.fn(), canGoBack: () => true };
let mockParams: Record<string, string> = {};
jest.mock('expo-router', () => ({ useRouter: () => mockRouter, useLocalSearchParams: () => mockParams }));
jest.mock('@/auth/boot', () => ({ api: { fetchWordTest: jest.fn(), fetchEstimate: jest.fn(), saveProfile: jest.fn(), checkLanguage: jest.fn() } }));
jest.mock('@/onboarding/finished', () => ({ markOnboardingFinished: jest.fn(async () => {}) }));
jest.mock('react-native-safe-area-context', () => ({ useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }) }));

const mockApi = jest.mocked(api);
const spanish = { code: 'es', name: 'Spanish' };
const test3 = {
  supported: true,
  bands: [
    { level: 'basic' as const, words: ['hola', 'gracias', 'el agua', 'la casa'] },
    { level: 'intermediate' as const, words: ['aunque', 'lograr'] },
    { level: 'advanced' as const, words: ['baladí', 'ufano'] },
  ],
};
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
    mockApi.checkLanguage.mockResolvedValue({ result: 'match', language: { code: 'sv', name: 'Swedish', listed: false } });
    await fireEvent.press(continueButton());
    await waitFor(() => expect(getAnswers().learning).toEqual({ code: null, name: 'Swedish' }));
    expect(mockApi.checkLanguage).toHaveBeenCalledWith('Swedish');
  });

  test('coming back keeps the answer', async () => {
    setAnswers({ learning: spanish });
    await render(<LearningScreen />);
    expect(screen.getByRole('radio', { name: 'Spanish' }).props.accessibilityState.checked).toBe(true);
  });
});

test('O1c I speak lists the 13 languages and Other, and goes to Welcome', async () => {
  await render(<SpeaksScreen />);
  expect(screen.getByRole('header', { name: 'What language do you speak?' })).toBeOnTheScreen();
  expect(screen.getAllByRole('radio').map((r) => r.props.accessibilityLabel)).toEqual([...THIRTEEN, 'Other']);
  await fireEvent.press(screen.getByRole('radio', { name: 'Persian' }));
  await fireEvent.press(continueButton());
  expect(getAnswers().speaks).toEqual({ code: 'fa', name: 'Persian' });
  expect(mockRouter.push).toHaveBeenCalledWith('/onboarding/welcome');
});

const THIRTEEN = ['English', 'Spanish', 'French', 'German', 'Italian', 'Portuguese', 'Russian', 'Arabic', 'Persian', 'Turkish', 'Japanese', 'Chinese', 'Korean'];

describe('O1 lists and typed language check', () => {
  const typeOther = async (text: string) => {
    await fireEvent.press(screen.getByRole('radio', { name: 'Other' }));
    await fireEvent.changeText(screen.getByLabelText('Language name'), text);
  };

  test('O1 lists the 13 languages in order, then Other', async () => {
    await render(<LearningScreen />);
    expect(screen.getAllByRole('radio').map((r) => r.props.accessibilityLabel)).toEqual([...THIRTEEN, 'Other']);
  });

  test('a listed language is not checked', async () => {
    await render(<LearningScreen />);
    await fireEvent.press(screen.getByRole('radio', { name: 'Korean' }));
    await fireEvent.press(continueButton());
    expect(mockApi.checkLanguage).not.toHaveBeenCalled();
    expect(getAnswers().learning).toEqual({ code: 'ko', name: 'Korean' });
  });

  test('busy while checking: one call only', async () => {
    let finish: (v: unknown) => void = () => {};
    mockApi.checkLanguage.mockReturnValue(new Promise((r) => (finish = r)) as never);
    await render(<LearningScreen />);
    await typeOther('swedish');
    await fireEvent.press(continueButton());
    const busy = screen.getByRole('button', { name: 'Checking…' });
    expect(isOff(busy)).toBe(true);
    await fireEvent.press(busy);
    expect(mockApi.checkLanguage).toHaveBeenCalledTimes(1);
    await act(async () => finish({ result: 'match', language: { code: 'sv', name: 'Swedish', listed: false } }));
    expect(getAnswers().learning).toEqual({ code: null, name: 'Swedish' });
  });

  test('typed name of a listed language becomes that language', async () => {
    mockApi.checkLanguage.mockResolvedValue({ result: 'match', language: { code: 'es', name: 'Spanish', listed: true } });
    await render(<LearningScreen />);
    await typeOther('spanish');
    await fireEvent.press(continueButton());
    await waitFor(() => expect(mockRouter.push).toHaveBeenCalledWith('/onboarding/speaks'));
    expect(getAnswers().learning).toEqual(spanish);
  });

  test('did you mean: accept the suggestion', async () => {
    mockApi.checkLanguage.mockResolvedValue({ result: 'suggestion', language: { code: 'es', name: 'Spanish', listed: true } });
    await render(<LearningScreen />);
    await typeOther('spansh');
    await fireEvent.press(continueButton());
    expect(await screen.findByText('Did you mean Spanish?')).toBeOnTheScreen();
    expect(mockRouter.push).not.toHaveBeenCalled();
    await fireEvent.press(screen.getByRole('button', { name: 'Yes, Spanish' }));
    expect(getAnswers().learning).toEqual(spanish);
    expect(mockRouter.push).toHaveBeenCalledWith('/onboarding/speaks');
  });

  test('did you mean: the keyboard closes so the box can be seen', async () => {
    const dismiss = jest.spyOn(Keyboard, 'dismiss');
    mockApi.checkLanguage.mockResolvedValue({ result: 'suggestion', language: { code: 'es', name: 'Spanish', listed: true } });
    await render(<LearningScreen />);
    await typeOther('spansh');
    await fireEvent.press(continueButton());
    await screen.findByText('Did you mean Spanish?');
    expect(dismiss).toHaveBeenCalled();
    dismiss.mockRestore();
  });

  test('did you mean: editing the text hides it', async () => {
    mockApi.checkLanguage.mockResolvedValue({ result: 'suggestion', language: { code: 'sv', name: 'Swedish', listed: false } });
    await render(<LearningScreen />);
    await typeOther('swedsh');
    await fireEvent.press(continueButton());
    expect(await screen.findByText('Did you mean Swedish?')).toBeOnTheScreen();
    await fireEvent.changeText(screen.getByLabelText('Language name'), 'swedis');
    expect(screen.queryByText('Did you mean Swedish?')).toBeNull();
  });

  test('not a language: the pop-up, and the app stays', async () => {
    const alert = jest.spyOn(Alert, 'alert').mockImplementation(() => {});
    mockApi.checkLanguage.mockResolvedValue({ result: 'unknown', language: null });
    await render(<LearningScreen />);
    await typeOther('qwzx');
    await fireEvent.press(continueButton());
    await waitFor(() => expect(alert).toHaveBeenCalled());
    expect(alert.mock.calls[0]![1]).toBe("We didn't recognise this language. Please check the spelling or pick one from the list.");
    expect(mockRouter.push).not.toHaveBeenCalled();
    expect(screen.getByLabelText('Language name').props.value).toBe('qwzx');
    alert.mockRestore();
  });

  test('a failed check keeps the text as typed and goes on', async () => {
    mockApi.checkLanguage.mockRejectedValue(new Error('request failed'));
    await render(<LearningScreen />);
    await typeOther('Klingon ');
    await fireEvent.press(continueButton());
    await waitFor(() => expect(mockRouter.push).toHaveBeenCalledWith('/onboarding/speaks'));
    expect(getAnswers().learning).toEqual({ code: null, name: 'Klingon' });
  });
});

describe('O1c blocks the language being learned', () => {
  const line = "You're learning Spanish. Pick the language you already speak.";
  beforeEach(() => setAnswers({ learning: spanish }));

  test('same listed language: the line shows and Continue is off; another one clears it', async () => {
    await render(<SpeaksScreen />);
    await fireEvent.press(screen.getByRole('radio', { name: 'Spanish' }));
    expect(screen.getByText(line)).toBeOnTheScreen();
    expect(isOff(continueButton())).toBe(true);
    await fireEvent.press(screen.getByRole('radio', { name: 'English' }));
    expect(screen.queryByText(line)).toBeNull();
    expect(isOff(continueButton())).toBe(false);
  });

  test('typed name that is the learned language: the line shows and the app stays', async () => {
    mockApi.checkLanguage.mockResolvedValue({ result: 'match', language: { code: 'es', name: 'Spanish', listed: true } });
    await render(<SpeaksScreen />);
    await fireEvent.press(screen.getByRole('radio', { name: 'Other' }));
    await fireEvent.changeText(screen.getByLabelText('Language name'), 'spanish');
    await fireEvent.press(continueButton());
    expect(await screen.findByText(line)).toBeOnTheScreen();
    expect(mockRouter.push).not.toHaveBeenCalled();
    expect(getAnswers().speaks).toBeNull();
  });

  test('typed language same as a typed learned language', async () => {
    setAnswers({ learning: { code: null, name: 'Swedish' } });
    mockApi.checkLanguage.mockResolvedValue({ result: 'match', language: { code: 'sv', name: 'Swedish', listed: false } });
    await render(<SpeaksScreen />);
    await fireEvent.press(screen.getByRole('radio', { name: 'Other' }));
    await fireEvent.changeText(screen.getByLabelText('Language name'), 'swedish');
    await fireEvent.press(continueButton());
    expect(await screen.findByText("You're learning Swedish. Pick the language you already speak.")).toBeOnTheScreen();
    expect(mockRouter.push).not.toHaveBeenCalled();
  });
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
    expect(mockRouter.push).toHaveBeenCalledWith('/onboarding/word-test?band=0');
  });
});

describe('O4–O6 Word test', () => {
  beforeEach(() => setAnswers({ learning: spanish, level: 'some_basics' }));

  test('loading, then chips; select and count; Continue goes to the next band', async () => {
    let answer!: (t: typeof test3) => void;
    mockApi.fetchWordTest.mockReturnValue(new Promise((resolve) => (answer = resolve)));
    mockParams = { band: '0' };
    await render(<WordTestScreen />);
    expect(screen.getByText('Loading words…')).toBeOnTheScreen();
    await act(async () => answer(test3));
    await waitFor(() => expect(screen.getByText('hola')).toBeOnTheScreen());
    expect(mockApi.fetchWordTest).toHaveBeenCalledWith('es');
    expect(screen.getByText('BASIC · 1 OF 3')).toBeOnTheScreen();
    expect(screen.getByText('3/10')).toBeOnTheScreen();
    expect(screen.getByText('0 SELECTED')).toBeOnTheScreen();
    for (const w of ['hola', 'gracias', 'la casa']) await fireEvent.press(screen.getByRole('checkbox', { name: w }));
    expect(screen.getByText('3 SELECTED')).toBeOnTheScreen();
    await fireEvent.press(screen.getByRole('checkbox', { name: 'la casa' }));
    expect(screen.getByText('2 SELECTED')).toBeOnTheScreen();
    await fireEvent.press(continueButton());
    expect(getAnswers().known[0]).toEqual(['hola', 'gracias']);
    expect(mockRouter.push).toHaveBeenCalledWith('/onboarding/word-test?band=1');
  });

  test('“I don’t know any of these” clears this band and continues', async () => {
    mockApi.fetchWordTest.mockResolvedValue(test3);
    mockParams = { band: '0' };
    await render(<WordTestScreen />);
    await waitFor(() => expect(screen.getByText('hola')).toBeOnTheScreen());
    await fireEvent.press(screen.getByRole('checkbox', { name: 'hola' }));
    await fireEvent.press(screen.getByRole('button', { name: 'I don’t know any of these' }));
    expect(getAnswers().known[0]).toEqual([]);
    expect(mockRouter.push).toHaveBeenCalledWith('/onboarding/word-test?band=1');
  });

  test('the last band goes to the estimate; the test is fetched only once', async () => {
    setAnswers({ wordTest: test3 });
    mockParams = { band: '2' };
    await render(<WordTestScreen />);
    expect(screen.getByText('ADVANCED · 3 OF 3')).toBeOnTheScreen();
    expect(screen.getByText('5/10')).toBeOnTheScreen();
    expect(mockApi.fetchWordTest).not.toHaveBeenCalled();
    await fireEvent.press(continueButton());
    expect(mockRouter.push).toHaveBeenCalledWith('/onboarding/estimate');
  });

  test('a language without a test skips to Goal', async () => {
    mockApi.fetchWordTest.mockResolvedValue({ supported: false, bands: [] });
    mockParams = { band: '0' };
    await render(<WordTestScreen />);
    await waitFor(() => expect(mockRouter.replace).toHaveBeenCalledWith('/onboarding/goal'));
  });

  test('server error shows a message and Try again', async () => {
    mockApi.fetchWordTest.mockRejectedValueOnce(new Error('down')).mockResolvedValue(test3);
    mockParams = { band: '0' };
    await render(<WordTestScreen />);
    await waitFor(() => expect(screen.getByText('Could not load the words.')).toBeOnTheScreen());
    await fireEvent.press(screen.getByRole('button', { name: 'Try again' }));
    await waitFor(() => expect(screen.getByText('hola')).toBeOnTheScreen());
  });
});

describe('O7 Your estimate', () => {
  beforeEach(() => setAnswers({ learning: spanish, known: [['hola'], [], ['ufano']] }));

  test('loading, then the number, the caption and the level pill', async () => {
    let answer!: (e: { knownWords: number; outOf: number; cefr: string }) => void;
    mockApi.fetchEstimate.mockReturnValue(new Promise((resolve) => (answer = resolve)));
    await render(<EstimateScreen />);
    expect(screen.getByText('Counting…')).toBeOnTheScreen();
    await act(async () => answer({ knownWords: 1850, outOf: 5000, cefr: 'A2+' }));
    await waitFor(() => expect(screen.getByText('1,850')).toBeOnTheScreen());
    expect(mockApi.fetchEstimate).toHaveBeenCalledWith('es', ['hola', 'ufano']);
    expect(screen.getByText('YOU ALREADY KNOW')).toBeOnTheScreen();
    expect(screen.getByText('of the 5,000 most common\nSpanish words')).toBeOnTheScreen();
    expect(screen.getByText('A2+')).toBeOnTheScreen();
    expect(screen.getByText('6/10')).toBeOnTheScreen();
    await fireEvent.press(continueButton());
    expect(getAnswers().estimate).toEqual({ knownWords: 1850, outOf: 5000, cefr: 'A2+' });
    expect(mockRouter.push).toHaveBeenCalledWith('/onboarding/goal');
  });

  test('error shows Try again', async () => {
    mockApi.fetchEstimate.mockRejectedValueOnce(new Error('down')).mockResolvedValue({ knownWords: 0, outOf: 5000, cefr: 'A1' });
    await render(<EstimateScreen />);
    await waitFor(() => expect(screen.getByText('Could not count your words.')).toBeOnTheScreen());
    await fireEvent.press(screen.getByRole('button', { name: 'Try again' }));
    await waitFor(() => expect(screen.getByText('A1')).toBeOnTheScreen());
  });
});

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

  test('20 tiles; select and count; save; then the Kai chat', async () => {
    mockApi.saveProfile.mockImplementation(async (p) => p);
    await render(<InterestsScreen />);
    expect(screen.getByRole('header', { name: 'What are you into?' })).toBeOnTheScreen();
    expect(screen.getByText('8/10')).toBeOnTheScreen();
    expect(screen.getAllByRole('checkbox')).toHaveLength(20);
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
