import { render, screen } from '@testing-library/react-native';
import { Platform } from 'react-native';

import NotFound from '@/app/+not-found';
import Sitemap from '@/app/_sitemap';
import { fitTextBox } from '@/platform/grow-text-box';
import { NoRound } from '@/platform/no-round';

// More browser cases found by probing the built web app (2026-11-25).
const mockRedirect = jest.fn((_: { href: string }) => null);
jest.mock('expo-router', () => ({ Redirect: (props: { href: string }) => mockRedirect(props) }));

const realOS = Platform.OS;
const setOS = (os: typeof Platform.OS) => Object.defineProperty(Platform, 'OS', { configurable: true, get: () => os });
afterEach(() => {
  setOS(realOS);
  mockRedirect.mockClear();
});

test('an address that does not exist opens the app’s start, not a developer page', async () => {
  await render(<NotFound />);
  expect(mockRedirect).toHaveBeenCalledWith(expect.objectContaining({ href: '/' }));
});

test('the router’s list of all pages is not shown to visitors', async () => {
  await render(<Sitemap />);
  expect(mockRedirect).toHaveBeenCalledWith(expect.objectContaining({ href: '/' }));
});

test('Use it opened with no round (a reload in the browser) goes to Review; on the phone it stays an empty screen', async () => {
  setOS('web');
  await render(<NoRound />);
  expect(mockRedirect).toHaveBeenCalledWith(expect.objectContaining({ href: '/(tabs)/review' }));
  mockRedirect.mockClear();
  screen.unmount();
  setOS('ios');
  await render(<NoRound />);
  expect(mockRedirect).not.toHaveBeenCalled();
});

test('the chat box in a browser is as tall as its text, between one line and six', () => {
  const box = (scrollHeight: number) => ({ style: { height: '' }, scrollHeight });
  const one = box(36), three = box(80), ten = box(400);
  fitTextBox(one, 36, 144);
  fitTextBox(three, 36, 144);
  fitTextBox(ten, 36, 144);
  expect(one.style.height).toBe('36px');
  expect(three.style.height).toBe('80px');
  expect(ten.style.height).toBe('144px');
});

test('the box gets shorter again when text is taken out: its height is measured from nothing', () => {
  const seen: string[] = [];
  const el = { scrollHeight: 58, style: { set height(v: string) { seen.push(v); }, get height() { return seen.at(-1) ?? ''; } } };
  fitTextBox(el, 36, 144);
  expect(seen).toEqual(['0px', '58px']);
});
