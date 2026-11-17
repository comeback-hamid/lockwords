import { fireEvent, render, screen } from '@testing-library/react-native';

import WelcomeScreen from '@/app/onboarding/welcome';
import { KaiHeader } from '@/components/chat/kai-header';

// Skia does not draw in Jest: jest.setup.ts swaps the canvas for a plain view that shows its props.
jest.mock('expo-router', () => ({ useRouter: () => ({ push: jest.fn(), back: jest.fn() }) }));
jest.mock('react-native-safe-area-context', () => ({ useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }) }));

const canvas = () => screen.getByTestId('kai-canvas');

describe('Kai view', () => {
  test('the chat header shows the live Kai, labelled "Kai"', async () => {
    await render(<KaiHeader pose="listening" />);
    expect(screen.getByLabelText('Kai')).toBeOnTheScreen();
    expect(canvas().props.state).toBe('listening');
  });

  test('O2 Welcome: Kai waves when it opens', async () => {
    await render(<WelcomeScreen />);
    expect(screen.getByLabelText('Kai')).toBeOnTheScreen();
    expect(canvas().props.state).toBe('greeting');
  });

  test('O2 Welcome: tapping Kai waves again', async () => {
    await render(<WelcomeScreen />);
    const before = canvas().props.playKey;
    await fireEvent.press(screen.getByLabelText('Kai'));
    expect(canvas().props.state).toBe('greeting');
    expect(canvas().props.playKey).toBe(before + 1);
  });
});
