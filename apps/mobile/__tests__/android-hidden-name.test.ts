import { nameWhenShown } from '@/platform/hidden-name';

// Found by the first Maestro run on Android, 2026-11-25 (remove-words-and-decks): the red Delete button under a word
// row is hidden from screen readers until the row is swiped open, but Maestro on Android lists every view, so it read
// "Delete la propina" on a closed row. On Android a hidden control has no name until it shows.
test('Android: a hidden control has no name; it gets its name when it shows', () => {
  // An empty text, not `undefined`: React Native on Android keeps the old name when the label is taken away
  // (a row that was open and closed again still said "Delete pedir").
  expect(nameWhenShown('Delete la propina', false, 'android')).toBe('');
  expect(nameWhenShown('Delete la propina', true, 'android')).toBe('Delete la propina');
});

test('iOS and the browser keep the name always (they hide the control another way)', () => {
  expect(nameWhenShown('Delete la propina', false, 'ios')).toBe('Delete la propina');
  expect(nameWhenShown('Delete la propina', false, 'web')).toBe('Delete la propina');
});
