import { fireEvent, render, screen } from '@testing-library/react-native';
import { Platform } from 'react-native';

import { Composer } from '@/components/chat/composer';
import { isPlainEnter, sendOnEnter } from '@/platform/enter-key';
import { roundKey } from '@/platform/round-keys';

// The web app with a real keyboard (2026-11-25): Enter sends the chat message (Shift+Enter is a new line),
// and the review card is answered with the keys. The phone is not changed by any of this.
jest.mock('@/auth/boot', () => ({ api: { transcribe: jest.fn() } }));

const realOS = Platform.OS;
const setOS = (os: typeof Platform.OS) => Object.defineProperty(Platform, 'OS', { configurable: true, get: () => os });
afterEach(() => setOS(realOS));

test('a plain Enter sends; Shift+Enter and an Enter that picks a word in a writing system do not', () => {
  expect(isPlainEnter({ key: 'Enter' })).toBe(true);
  expect(isPlainEnter({ key: 'Enter', shiftKey: true })).toBe(false);
  expect(isPlainEnter({ key: 'Enter', isComposing: true })).toBe(false);
  expect(isPlainEnter({ key: 'a' })).toBe(false);
});

test('in a browser Enter in the chat box sends the text and leaves no new line; Shift+Enter does not send', async () => {
  setOS('web');
  const onSend = jest.fn();
  await render(<Composer placeholder="Type a message…" onSend={onSend} />);
  await fireEvent.changeText(screen.getByLabelText('Message'), 'hola');
  const shift = { nativeEvent: { key: 'Enter', shiftKey: true }, preventDefault: jest.fn() };
  await fireEvent(screen.getByLabelText('Message'), 'keyPress', shift);
  expect(onSend).not.toHaveBeenCalled();
  expect(shift.preventDefault).not.toHaveBeenCalled();
  const enter = { nativeEvent: { key: 'Enter' }, preventDefault: jest.fn() };
  await fireEvent(screen.getByLabelText('Message'), 'keyPress', enter);
  expect(onSend).toHaveBeenCalledWith('hola');
  expect(enter.preventDefault).toHaveBeenCalled();
  expect(screen.getByLabelText('Message').props.value).toBe('');
});

test('on the phone the chat box gets no key handler: Return works as before', () => {
  setOS('ios');
  expect(sendOnEnter(jest.fn())).toEqual({});
});

test('the review card keys: Space or Enter flips, the arrows answer, Backspace or Z takes the last swipe back', () => {
  expect(roundKey({ key: ' ' })).toBe('flip');
  expect(roundKey({ key: 'Enter' })).toBe('flip');
  expect(roundKey({ key: 'ArrowLeft' })).toBe('hard');
  expect(roundKey({ key: 'ArrowUp' })).toBe('known');
  expect(roundKey({ key: 'ArrowRight' })).toBe('easy');
  expect(roundKey({ key: 'Backspace' })).toBe('undo');
  expect(roundKey({ key: 'z' })).toBe('undo');
  expect(roundKey({ key: 'ArrowDown' })).toBeNull();
});

test('a key with Ctrl, Alt or Cmd, a key typed into a text box, and a key on a focused button are left alone', () => {
  expect(roundKey({ key: 'ArrowLeft', metaKey: true })).toBeNull();
  expect(roundKey({ key: 'ArrowLeft', ctrlKey: true })).toBeNull();
  expect(roundKey({ key: 'ArrowLeft', altKey: true })).toBeNull();
  expect(roundKey({ key: ' ', targetTag: 'TEXTAREA' })).toBeNull();
  expect(roundKey({ key: 'z', targetTag: 'INPUT' })).toBeNull();
  // Space and Enter on a focused button press that button; the arrows still answer the card.
  expect(roundKey({ key: 'Enter', targetRole: 'button' })).toBeNull();
  expect(roundKey({ key: 'ArrowRight', targetRole: 'button' })).toBe('easy');
});

// Found 2026-11-25 by the browser edge test: screens of the other tabs stay in the page, under the open one. With a
// round open in Review, an arrow key pressed on Progress answered the hidden card.
describe('the card keys only work while the round is the screen on top', () => {
  const { roundOnTop } = jest.requireActual<typeof import('@/platform/round-keys')>('@/platform/round-keys');
  const round = (inPage: boolean) => ({ offsetParent: inPage ? {} : null, getBoundingClientRect: () => ({ left: 100, top: 50, width: 400, height: 600 }), contains: (el: unknown) => el === inside });
  const inside = { name: 'the card' };
  const other = { name: 'the Progress screen' };
  const page = (rounds: ReturnType<typeof round>[], atPoint: unknown) => ({ querySelectorAll: () => rounds, elementFromPoint: jest.fn(() => atPoint) });

  test('the round is on top: its own element is what the middle of it shows', () => {
    const doc = page([round(true)], inside);
    expect(roundOnTop(doc)).toBe(true);
    expect(doc.elementFromPoint).toHaveBeenCalledWith(300, 350);
  });

  test('another tab covers the round: no', () => {
    expect(roundOnTop(page([round(true)], other))).toBe(false);
  });

  test('a round on a screen that is not drawn (under Use it), or no round at all: no', () => {
    expect(roundOnTop(page([round(false)], inside))).toBe(false);
    expect(roundOnTop(page([], inside))).toBe(false);
  });
});
