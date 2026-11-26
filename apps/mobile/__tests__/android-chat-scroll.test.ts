import { Platform } from 'react-native';

import { avoidKeyboard, scrollChatToEnd } from '@/components/chat/keyboard';

// Found by the first Maestro run on Android, 2026-11-25: Kai's reply options were under the text box. On Android the
// list does not know its new height yet when the chat asks it to scroll, so it stopped one item short of the end.
// The chat now asks again on the next frame, when the new line or the options are laid out.
const list = () => {
  const scrollToEnd = jest.fn();
  return { ref: { current: { scrollToEnd } }, scrollToEnd };
};
const os = Platform.OS;
let frames: FrameRequestCallback[] = [];
beforeEach(() => {
  frames = [];
  jest.spyOn(global, 'requestAnimationFrame').mockImplementation((cb) => frames.push(cb));
});
afterEach(() => {
  Platform.OS = os;
  jest.restoreAllMocks();
});

test('Android: the chat scrolls to its end again on the next frame, the same way (a jump with options on screen)', () => {
  Platform.OS = 'android';
  const { ref, scrollToEnd } = list();
  scrollChatToEnd(ref, true);
  expect(scrollToEnd).toHaveBeenCalledTimes(1);
  frames.forEach((run) => run(0));
  expect(scrollToEnd).toHaveBeenCalledTimes(2);
  expect(scrollToEnd).toHaveBeenLastCalledWith({ animated: false });
});

test('Android: a list that went away before the next frame is left alone', () => {
  Platform.OS = 'android';
  const { ref } = list();
  scrollChatToEnd(ref, false);
  (ref as { current: unknown }).current = null;
  expect(() => frames.forEach((run) => run(0))).not.toThrow();
});

test('iOS: one scroll, as before', () => {
  Platform.OS = 'ios';
  const { ref, scrollToEnd } = list();
  scrollChatToEnd(ref, false);
  frames.forEach((run) => run(0));
  expect(scrollToEnd).toHaveBeenCalledTimes(1);
});

// Android draws the app under the keyboard (edge to edge), so the window no longer gets smaller by itself:
// a screen with a text box must make room, as on iOS. A browser does it alone.
test('screens make room for the keyboard on the phone, iOS and Android', () => {
  expect(avoidKeyboard('ios')).toBe('padding');
  expect(avoidKeyboard('android')).toBe('padding');
  expect(avoidKeyboard('web')).toBeUndefined();
});
