import { useEffect, type RefObject } from 'react';
import { Keyboard, Platform } from 'react-native';

// Keyboard rules for the whole app (Hamid, 2026-11-23):
// Return closes the keyboard, and in a chat any scroll of the messages (up or down) closes it too.
export const closeKeyboard = () => Keyboard.dismiss();

// Spread on the ScrollView of every chat's messages. A tap on an option or a card still works with the keyboard up.
// Give the list `chatMessagesGrow` in its contentContainerStyle: a short chat then keeps its options at the bottom.
export const chatScrollProps = { testID: 'chat-messages', keyboardShouldPersistTaps: 'handled', keyboardDismissMode: 'on-drag', onScrollBeginDrag: closeKeyboard } as const;

// The reply options are the last item of the message list. When the keyboard opens, the list scrolls to its end,
// so the newest line and the options stay in view above the keyboard (and still scroll with the chat).
export function useScrollToEndOnKeyboard(list: RefObject<{ scrollToEnd(options?: { animated?: boolean }): void } | null>) {
  useEffect(() => {
    const shown = Keyboard.addListener('keyboardDidShow', () => list.current?.scrollToEnd({ animated: true }));
    return () => shown.remove();
  }, [list]);
}
export const chatMessagesGrow = { flexGrow: 1 } as const;

// Every chat calls this when its messages, typing bubble or options change. With the reply options on screen the list
// jumps to its end with no animation: on iOS a tap on a list that is still scrolling only stops the scroll, so a quick
// tap on an option was lost (found by the full Maestro pass, 2026-11-23). With no options it glides as before.
// On Android the list does not know its new height yet when this runs, so it stopped one item short and the options
// stayed under the text box (found by the first Maestro run on Android, 2026-11-25). There it asks again on the next
// frame, when the new line or the options are laid out.
export function scrollChatToEnd(list: RefObject<{ scrollToEnd(options?: { animated?: boolean }): void } | null>, optionsShown: boolean) {
  const toEnd = () => list.current?.scrollToEnd({ animated: !optionsShown });
  toEnd();
  if (Platform.OS === 'android') requestAnimationFrame(toEnd);
}

// `behavior` for the KeyboardAvoidingView of every screen with a text box. Android draws the app under the keyboard
// (edge to edge), so the window no longer gets smaller by itself: the screen makes room, as on iOS. A browser does it alone.
export const avoidKeyboard = (os: string = Platform.OS) => (os === 'ios' || os === 'android' ? ('padding' as const) : undefined);
