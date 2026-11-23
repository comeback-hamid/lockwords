import { scrollChatToEnd } from '@/components/chat/keyboard';

// Found by the full Maestro pass on main, 2026-11-23: the reply options are the last item of the chat list, and
// the list scrolled to its end with an animation when they appeared. On iOS a tap on a list that is still scrolling
// only stops the scroll, so a quick tap on an option did nothing. With options on screen the chat jumps, no animation.
const list = () => {
  const scrollToEnd = jest.fn();
  return { ref: { current: { scrollToEnd } }, scrollToEnd };
};

test('the reply options are shown: the chat jumps to its end, so a tap on an option is not lost', () => {
  const { ref, scrollToEnd } = list();
  scrollChatToEnd(ref, true);
  expect(scrollToEnd).toHaveBeenCalledWith({ animated: false });
});

test('no reply options (Kai is typing, a new line came): the chat glides to its end as before', () => {
  const { ref, scrollToEnd } = list();
  scrollChatToEnd(ref, false);
  expect(scrollToEnd).toHaveBeenCalledWith({ animated: true });
});

test('a list that is not mounted yet does nothing', () => {
  expect(() => scrollChatToEnd({ current: null }, true)).not.toThrow();
});
