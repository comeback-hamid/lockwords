import { Platform } from 'react-native';

// Page-wide rules a browser needs and a phone does not. Added once, when the app starts.
// - A text box shows its own frame when it is in use (Figma Composer, Text field), so the browser's blue focus ring
//   around the text is taken off. Buttons keep their ring: a person using Tab must see where they are.
// - A browser starts its own drag of a picture (to drop it on the desktop) when the mouse moves on it with the button
//   down. Firefox then cancels our swipe of a review card. The app has nothing to drag out, so that drag is off.
export const PAGE_CSS = 'input:focus,textarea:focus{outline:none}';
const STYLE_ID = 'lockwords-page-style';

export function installPageStyle() {
  if (Platform.OS !== 'web' || typeof document === 'undefined' || document.getElementById(STYLE_ID)) return;
  const style = document.createElement('style');
  style.id = STYLE_ID;
  style.textContent = PAGE_CSS;
  document.head.appendChild(style);
  document.addEventListener('dragstart', (e) => e.preventDefault());
}
