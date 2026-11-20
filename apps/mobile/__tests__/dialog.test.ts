import { Alert, Platform } from 'react-native';

// The helper reads the platform at call time, so one copy of the module serves both cases.
const load = (os: string) => {
  Platform.OS = os as typeof Platform.OS;
  return require('@/platform/dialog') as typeof import('@/platform/dialog');
};
const real = Platform.OS;
afterEach(() => {
  Platform.OS = real;
  delete (globalThis as { window?: unknown }).window;
});

test('on a phone: the system pop-up with Cancel and the action', () => {
  const spy = jest.spyOn(Alert, 'alert').mockImplementation(() => {});
  const onYes = jest.fn();
  load('ios').confirmAction('Remove this deck?', 'This cannot be undone.', 'Remove', onYes);
  const buttons = spy.mock.calls[0]![2]!;
  expect(buttons.map((b) => b.text)).toEqual(['Cancel', 'Remove']);
  buttons[1]!.onPress?.();
  expect(onYes).toHaveBeenCalled();
});

test('in a browser: the browser’s own confirm; the action runs only on yes', () => {
  const confirm = jest.fn().mockReturnValueOnce(false).mockReturnValueOnce(true);
  const alert = jest.fn();
  (globalThis as { window?: unknown }).window = { confirm, alert };
  const dialog = load('web');
  const onYes = jest.fn();
  dialog.confirmAction('Remove this deck?', 'This cannot be undone.', 'Remove', onYes);
  expect(onYes).not.toHaveBeenCalled();
  dialog.confirmAction('Remove this deck?', 'This cannot be undone.', 'Remove', onYes);
  expect(onYes).toHaveBeenCalledTimes(1);
  expect(confirm).toHaveBeenCalledWith('Remove this deck?\n\nThis cannot be undone.');
  dialog.tell('Language not recognised', 'Check the spelling.');
  expect(alert).toHaveBeenCalledWith('Language not recognised\n\nCheck the spelling.');
});
