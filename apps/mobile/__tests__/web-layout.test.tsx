import { fireEvent, render, screen } from '@testing-library/react-native';
import { Platform } from 'react-native';

import { KeyHints } from '@/platform/key-hints';
import { contentWidth, WEB, webMode } from '@/platform/web-layout';
import { WebTabBar } from '@/platform/web-tab-bar';

// The web app on any window (web-desktop-layout, Figma page "Web"): a phone-size window looks like the phone, a
// middle one is a centered column, a wide one has the tabs in a side bar. The phone app is never anything but 'phone'.
const realOS = Platform.OS;
const setOS = (os: typeof Platform.OS) => Object.defineProperty(Platform, 'OS', { configurable: true, get: () => os });
afterEach(() => setOS(realOS));
const state = (index: number) => ({ index, routes: [{ key: 'a', name: 'index' }, { key: 'b', name: 'review' }, { key: 'c', name: 'progress' }] });

test('the three sizes change at 600 and at 1024', () => {
  setOS('web');
  expect(webMode(390)).toBe('phone');
  expect(webMode(599)).toBe('phone');
  expect(webMode(600)).toBe('tablet');
  expect(webMode(1023)).toBe('tablet');
  expect(webMode(1024)).toBe('desktop');
  expect(webMode(1920)).toBe('desktop');
});

test('the phone app is always a phone, whatever the screen', () => {
  setOS('ios');
  expect(webMode(1366)).toBe('phone');
  expect(contentWidth(1366)).toBe(1366);
  expect(contentWidth(1366, true)).toBe(1366);
});

test('how wide a screen really is: the window on a phone, a 600 column in a tab, a 480 column outside the tabs', () => {
  setOS('web');
  expect(contentWidth(390)).toBe(390);
  expect(contentWidth(390, true)).toBe(390);
  expect(contentWidth(820)).toBe(WEB.column);
  expect(contentWidth(1440)).toBe(WEB.column);
  expect(contentWidth(820, true)).toBe(WEB.focusColumn);
  expect(contentWidth(1440, true)).toBe(WEB.focusColumn);
  // A window just past 1024: the column is what is left beside the side bar, never wider than 600.
  expect(contentWidth(1024)).toBe(Math.min(WEB.column, 1024 - WEB.rail));
  expect(WEB.column).toBe(600);
  expect(WEB.focusColumn).toBe(480);
});

test('the side bar: the name, three rows, the open one marked, a click opens another, the red dot on Review', async () => {
  const onOpen = jest.fn();
  await render(<WebTabBar state={state(1)} dot onOpen={onOpen} side />);
  expect(screen.getByText('Lockwords')).toBeOnTheScreen();
  expect(screen.getByRole('tab', { name: 'Review' })).toBeSelected();
  expect(screen.getByRole('tab', { name: 'New words' })).not.toBeSelected();
  await fireEvent.press(screen.getByRole('tab', { name: 'Progress' }));
  expect(onOpen).toHaveBeenCalledWith('c');
  await fireEvent.press(screen.getByRole('tab', { name: 'Review' }));
  expect(onOpen).toHaveBeenCalledTimes(1);
  expect(screen.getByLabelText('New words to review')).toBeOnTheScreen();
});

test('the bottom bar has no name on it', async () => {
  await render(<WebTabBar state={state(0)} dot={false} onOpen={jest.fn()} />);
  expect(screen.queryByText('Lockwords')).toBeNull();
});

test('the keys of the review card are named under it on a wide window only', async () => {
  setOS('web');
  const wide = await render(<KeyHints windowWidth={1440} />);
  expect(screen.getByText('Space')).toBeOnTheScreen();
  expect(screen.getByText('flip')).toBeOnTheScreen();
  expect(screen.getByLabelText('Keys: Space flips the card, left arrow is Hard, up arrow is Know it, right arrow is Easy, Backspace takes the last answer back')).toBeOnTheScreen();
  wide.unmount();
  await render(<KeyHints windowWidth={390} />);
  expect(screen.queryByText('Space')).toBeNull();
});

test('no key names on the phone app', async () => {
  setOS('ios');
  await render(<KeyHints windowWidth={1440} />);
  expect(screen.queryByText('Space')).toBeNull();
});
