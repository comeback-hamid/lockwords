import { Platform, useWindowDimensions } from 'react-native';

// How the web app uses a window (Figma page "Web"). The phone app never calls the layout rules: it is always 'phone'.
// - phone: under 600 wide. The app fills the window, the tab bar is at the bottom.
// - tablet: 600 to 1023. One centered column, the tab bar at the bottom of the column.
// - desktop: 1024 and wider. A side bar on the left with the three tabs, the screen in a centered column beside it.
export type WebMode = 'phone' | 'tablet' | 'desktop';
export const WEB = { tablet: 600, desktop: 1024, column: 600, focusColumn: 480, rail: 248 } as const;

export function webMode(windowWidth: number): WebMode {
  if (Platform.OS !== 'web') return 'phone';
  return windowWidth >= WEB.desktop ? 'desktop' : windowWidth >= WEB.tablet ? 'tablet' : 'phone';
}

// The width a screen really gets. `focus` = a screen outside the tabs (onboarding, Use it, a deck): a narrower column.
export function contentWidth(windowWidth: number, focus = false): number {
  const mode = webMode(windowWidth);
  if (mode === 'phone') return windowWidth;
  if (focus) return WEB.focusColumn;
  return Math.min(WEB.column, windowWidth - (mode === 'desktop' ? WEB.rail : 0));
}

export const useWebMode = () => webMode(useWindowDimensions().width);
// For parts that size themselves from the screen width (the deck ideas row).
export const useContentWidth = (focus = false) => contentWidth(useWindowDimensions().width, focus);
