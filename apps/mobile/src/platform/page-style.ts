import { Platform } from 'react-native';

// Page-wide rules a browser needs and a phone does not. Added once, when the app starts.
// - A text box shows its own frame when it is in use (Figma Composer, Text field), so the browser's blue focus ring
//   around the text is taken off. Buttons keep their ring: a person using Tab must see where they are.
// - A browser starts its own drag of a picture (to drop it on the desktop) when the mouse moves on it with the button
//   down. Firefox then cancels our swipe of a review card. The app has nothing to drag out, so that drag is off.
// - A phone's browser: iOS zooms the whole page when a text box under 16 px gets the cursor, so text boxes are 16 px
//   on touch screens; no grey flash on a tap; the page itself never scrolls or bounces (only the lists inside it);
//   controls do not get selected as text by a long press.
// - A mouse: a control gets a little darker under the pointer (only where there is a real pointer, so a touch screen
//   has no stuck hover), and the review card shows it can be grabbed.
// - The review card is dragged by a finger: the browser must not scroll or pull the page while it moves.
const CONTROLS = '[role=button],[role=tab],[role=radio],[role=checkbox],[role=switch]';
export const PAGE_CSS = [
  'input:focus,textarea:focus{outline:none}',
  '@media (pointer:coarse){input,textarea{font-size:16px!important}}',
  'html{-webkit-tap-highlight-color:transparent;-webkit-text-size-adjust:100%;text-size-adjust:100%}',
  'body{overscroll-behavior:none}',
  `${CONTROLS}{user-select:none;-webkit-user-select:none}`,
  `@media (hover:hover){${CONTROLS.split(',').map((c) => `${c}:hover`).join(',')}{filter:brightness(0.96)}}`,
  '[data-testid="review-card"]{touch-action:none;user-select:none;-webkit-user-select:none;cursor:grab}',
].join('');
const STYLE_ID = 'lockwords-page-style';

export function installPageStyle() {
  if (Platform.OS !== 'web' || typeof document === 'undefined' || document.getElementById(STYLE_ID)) return;
  const style = document.createElement('style');
  style.id = STYLE_ID;
  style.textContent = PAGE_CSS;
  document.head.appendChild(style);
  document.addEventListener('dragstart', (e) => e.preventDefault());
}
