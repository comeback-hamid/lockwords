import { Platform } from 'react-native';

// A real keyboard in a browser: Enter sends the chat message, Shift+Enter makes a new line.
// On the phone the keyboard's own Send key does this (the text box's `onSubmitEditing`), so nothing is added there.
type Key = { key: string; shiftKey?: boolean; isComposing?: boolean };
type KeyEvent = { nativeEvent: Key; preventDefault?: () => void };

// Enter alone. Not while the browser is still putting a word together (Japanese, Chinese, Korean typing).
export const isPlainEnter = (k: Key) => k.key === 'Enter' && !k.shiftKey && !k.isComposing;

// Props for a multi-line text box. `preventDefault` keeps the new line out of the box.
export function sendOnEnter(send: () => void): { onKeyPress?: (e: KeyEvent) => void } {
  if (Platform.OS !== 'web') return {};
  return {
    onKeyPress: (e) => {
      if (!isPlainEnter(e.nativeEvent)) return;
      e.preventDefault?.();
      send();
    },
  };
}
