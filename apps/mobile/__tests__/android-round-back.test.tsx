import { render } from '@testing-library/react-native';
import { BackHandler, Platform } from 'react-native';

import { useBlockBack } from '@/platform/back';

// Found by the Maestro run on Android, 2026-11-25 (word-card): an Easy swipe that starts at the left edge of the
// screen is Android's Back gesture, and Back from the Review tab opens the first tab, in the middle of a round.
// The same rule as on iOS (no swipe-back out of a round): while a card is on the screen, Back does nothing.
let mockFocused = true;
jest.mock('expo-router', () => ({ useIsFocused: () => mockFocused }));

function Round({ card }: { card: boolean }) {
  useBlockBack(card);
  return null;
}
const os = Platform.OS;
const remove = jest.fn();
let add: jest.SpyInstance;
beforeEach(() => {
  mockFocused = true;
  remove.mockClear();
  add = jest.spyOn(BackHandler, 'addEventListener').mockReturnValue({ remove });
});
afterEach(() => {
  Platform.OS = os;
  add.mockRestore();
});
const handler = () => add.mock.calls.at(-1)![1] as () => boolean;

test('Android: with a card on the screen Back is taken and does nothing', async () => {
  Platform.OS = 'android';
  await render(<Round card />);
  expect(add).toHaveBeenCalledWith('hardwareBackPress', expect.any(Function));
  expect(handler()()).toBe(true); // true = "handled": the tab does not change, the app stays open
});

test('Android: no card (the round is done), Back is the system’s again', async () => {
  Platform.OS = 'android';
  const view = await render(<Round card />);
  await view.rerender(<Round card={false} />);
  expect(remove).toHaveBeenCalledTimes(1);
  expect(add).toHaveBeenCalledTimes(1);
});

test('Android: another screen is on top of the round (Use it): its Back works', async () => {
  Platform.OS = 'android';
  mockFocused = false;
  await render(<Round card />);
  expect(add).not.toHaveBeenCalled();
});

test('iOS has no Back button: nothing is listened to', async () => {
  Platform.OS = 'ios';
  await render(<Round card />);
  expect(add).not.toHaveBeenCalled();
});
