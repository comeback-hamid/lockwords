import { useEffect, type RefObject } from 'react';
import { Keyboard } from 'react-native';

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
