import { Keyboard } from 'react-native';

// Keyboard rules for the whole app (Hamid, 2026-11-23):
// Return closes the keyboard, and in a chat any scroll of the messages (up or down) closes it too.
export const closeKeyboard = () => Keyboard.dismiss();

// Spread on the ScrollView of every chat's messages. A tap on an option or a card still works with the keyboard up.
export const chatScrollProps = { testID: 'chat-messages', keyboardShouldPersistTaps: 'handled', keyboardDismissMode: 'on-drag', onScrollBeginDrag: closeKeyboard } as const;
