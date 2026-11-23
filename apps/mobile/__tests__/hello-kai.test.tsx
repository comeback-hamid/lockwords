import { act, fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import { existsSync } from 'node:fs';
import { join } from 'node:path';

import type { ReviewCard } from '@/api/client';
import HelloScreen from '@/app/onboarding/hello';
import WelcomeScreen from '@/app/onboarding/welcome';
import UseItScreen from '@/app/use-it/[id]';
import { KaiHeader } from '@/components/chat/kai-header';
import { setTypingForTests } from '@/components/chat/use-kai-typing';
import { Kai } from '@/kai/kai';
import { startRoute } from '@/onboarding/flow';
import { sampleWord } from '@/onboarding/sample-word';
import { resetAnswers, setAnswers } from '@/onboarding/store';
import { setRound } from '@/review/round-store';

import appConfig from '../app.json';

const mockRouter = { push: jest.fn(), replace: jest.fn(), back: jest.fn() };
jest.mock('expo-router', () => ({ useRouter: () => mockRouter, useLocalSearchParams: () => ({ id: 'c1' }) }));
jest.mock('@/auth/boot', () => ({ api: { useIt: jest.fn(), askAboutWord: jest.fn() } }));
jest.mock('react-native-safe-area-context', () => ({ useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }) }));

const canvas = () => screen.getByTestId('kai-canvas');

beforeEach(() => {
  jest.clearAllMocks();
  resetAnswers();
});

describe('O0 Hello (the first screen of a fresh install)', () => {
  test('a new learner starts on Hello, not on the first question', () => {
    expect(startRoute(false)).toBe('/onboarding/hello');
    expect(startRoute(true)).toBe('/(tabs)');
  });

  test('a very big Kai waves, says who it is, and Start opens the first question', async () => {
    await render(<HelloScreen />);
    expect(screen.getByRole('header', { name: 'I’m Kai, welcome to Lockwords' })).toBeOnTheScreen();
    expect(canvas().props.state).toBe('greeting');
    expect(canvas().props.width).toBe(308);
    await fireEvent.press(screen.getByRole('button', { name: 'Start' }));
    expect(mockRouter.push).toHaveBeenCalledWith('/onboarding/learning');
  });

  test('Kai keeps waving: the hello plays again by itself, and when Kai is tapped', async () => {
    jest.useFakeTimers();
    try {
      await render(<HelloScreen />);
      const first = canvas().props.playKey;
      await act(async () => {
        jest.advanceTimersByTime(4000);
      });
      const second = canvas().props.playKey;
      expect(second).toBeGreaterThan(first);
      await fireEvent.press(screen.getByLabelText('Kai'));
      expect(canvas().props.playKey).toBeGreaterThan(second);
    } finally {
      jest.useRealTimers();
    }
  });
});

describe('O2 lock screen page', () => {
  test('the sample word is in the language the learner picked, with the meaning in their own language', async () => {
    setAnswers({ learning: { code: 'en', name: 'English' }, speaks: { code: 'fa', name: 'Persian' } });
    await render(<WelcomeScreen />);
    expect(screen.getByText('the bill')).toBeOnTheScreen();
    expect(screen.getByText('صورت‌حساب')).toBeOnTheScreen();
    expect(screen.queryByText('la cuenta')).toBeNull();
  });

  test('a Spanish learner still sees the Spanish word', async () => {
    setAnswers({ learning: { code: 'es', name: 'Spanish' }, speaks: { code: 'en', name: 'English' } });
    await render(<WelcomeScreen />);
    expect(screen.getByText('la cuenta')).toBeOnTheScreen();
    expect(screen.getByText('the bill')).toBeOnTheScreen();
  });

  test('Kai is much bigger there (twice the old 84)', async () => {
    await render(<WelcomeScreen />);
    expect(canvas().props.width).toBe(168);
  });

  test('sampleWord: every listed language has the word; a typed language shows no wrong-language word', () => {
    const lang = (code: string | null, name = 'x') => ({ code, name });
    expect(sampleWord(lang('fr'), lang('de'))).toEqual({ word: 'l’addition', translation: 'die Rechnung' });
    for (const code of ['en', 'es', 'fr', 'de', 'it', 'pt', 'ru', 'ar', 'fa', 'tr', 'ja', 'zh', 'ko']) {
      expect(sampleWord(lang(code), lang('en')).word).not.toBe('');
    }
    // No answers yet (a test or a deep link): the Figma sample.
    expect(sampleWord(null, null)).toEqual({ word: 'la cuenta', translation: 'the bill' });
    // A typed language (Other): we have no word for it, so the card shows the learner's own word and names the language.
    expect(sampleWord(lang(null, 'Swedish'), lang('en'))).toEqual({ word: 'the bill', translation: 'in Swedish' });
  });
});

describe('Kai: talking, listening, idle', () => {
  test('talking shows the speaking state, listening the listening state, neither is idle', async () => {
    const view = await render(<Kai talking />);
    expect(canvas().props.state).toBe('speaking');
    await view.rerender(<Kai listening />);
    expect(canvas().props.state).toBe('listening');
    await view.rerender(<Kai />);
    expect(canvas().props.state).toBe('idle');
  });

  test('talking wins over listening, and both win over a resting state; a one-shot state is not cut off', async () => {
    const view = await render(<Kai state="waiting" talking listening />);
    expect(canvas().props.state).toBe('speaking');
    await view.rerender(<Kai state="waiting" listening />);
    expect(canvas().props.state).toBe('listening');
    await view.rerender(<Kai state="thinking" talking />);
    expect(canvas().props.state).toBe('thinking');
    await view.rerender(<Kai state="celebrate" listening />);
    expect(canvas().props.state).toBe('celebrate');
  });

  test('the chat header passes them on', async () => {
    await render(<KaiHeader talking />);
    expect(canvas().props.state).toBe('speaking');
  });
});

describe('Use it: Kai moves with the chat', () => {
  const card: ReviewCard = { id: 'c1', deckId: 'd1', deckTopic: 'Ordering food', word: 'la propina', translation: 'the tip', example: 'Deja un 10 % de propina.', exampleTranslation: 'Leave a 10% tip.', stage: 3, canUseIt: true };
  beforeEach(() => setRound([card]));

  test('Kai listens while the learner types and rests when the box is empty', async () => {
    await render(<UseItScreen />);
    expect(canvas().props.state).toBe('idle');
    await fireEvent.changeText(screen.getByLabelText('Message'), 'Le dejé');
    expect(canvas().props.state).toBe('listening');
    await fireEvent.changeText(screen.getByLabelText('Message'), '');
    expect(canvas().props.state).toBe('idle');
  });

  test('Kai talks while its lines are being typed, then rests', async () => {
    setTypingForTests(true);
    jest.useFakeTimers();
    try {
      await render(<UseItScreen />);
      expect(canvas().props.state).toBe('speaking');
      await act(async () => {
        jest.advanceTimersByTime(10000);
      });
      await waitFor(() => expect(canvas().props.state).toBe('idle'));
    } finally {
      jest.useRealTimers();
      setTypingForTests(false);
    }
  });
});

describe('splash screen', () => {
  test('the app config has a splash picture that exists, on the app canvas color', () => {
    const plugin = appConfig.expo.plugins.find((p) => Array.isArray(p) && p[0] === 'expo-splash-screen') as [string, { image: string; imageWidth: number; backgroundColor: string }];
    expect(plugin[1].image).toBe('./assets/images/splash.png');
    expect(existsSync(join(__dirname, '..', plugin[1].image))).toBe(true);
    expect(plugin[1].imageWidth).toBeGreaterThanOrEqual(200);
    expect(plugin[1].backgroundColor).toBe('#f6f8fa');
  });
});
