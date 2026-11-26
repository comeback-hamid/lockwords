import { tabBarClearanceFor } from '@/theme/theme';

// The iOS tab bar floats over the screen, so a tab screen keeps room under its last control. On Android (and in a
// browser) the tab bar is a normal bar under the screen: the same room there was an empty band above the bar
// (seen on the emulator, 2026-11-25).
test('only iOS keeps room for a floating tab bar', () => {
  expect(tabBarClearanceFor('ios')).toBe(92);
  expect(tabBarClearanceFor('android')).toBe(0);
  expect(tabBarClearanceFor('web')).toBe(0);
});
