import { useLayoutEffect, type RefObject } from 'react';
import { Platform } from 'react-native';

// A multi-line text box in a browser does not grow with its text by itself (on the phone it does). This sets its
// height from its text, between `min` and `max`; past `max` the text scrolls inside the box.
type Box = { style: { height: string }; scrollHeight: number };

// Measured from nothing first, so the box also gets shorter when text is taken out.
export function fitTextBox(el: Box, min: number, max: number) {
  el.style.height = '0px';
  el.style.height = `${Math.min(max, Math.max(min, el.scrollHeight))}px`;
}

// Call it with the text box's ref and its text. Does nothing on the phone.
export function useGrowingTextBox(ref: RefObject<unknown>, text: string, min: number, max: number) {
  useLayoutEffect(() => {
    if (Platform.OS !== 'web') return;
    const el = ref.current as Box | null;
    if (el && typeof el.scrollHeight === 'number') fitTextBox(el, min, max);
  }, [ref, text, min, max]);
}
