import { fireEvent, render, screen } from '@testing-library/react-native';

import { WebTabBar } from '@/platform/web-tab-bar';

// The web app's own tab bar (the phone uses the system one). Three tabs, the open one is marked, a tap opens a tab,
// and Review carries the red dot when there are new words.
const state = (index: number) => ({ index, routes: [{ key: 'a', name: 'index' }, { key: 'b', name: 'review' }, { key: 'c', name: 'progress' }] });

test('three tabs with their names; the open one is marked; a tap opens another one', async () => {
  const onOpen = jest.fn();
  await render(<WebTabBar state={state(0)} dot={false} onOpen={onOpen} />);
  expect(screen.getByRole('tab', { name: 'New words' })).toBeSelected();
  expect(screen.getByRole('tab', { name: 'Review' })).not.toBeSelected();
  await fireEvent.press(screen.getByRole('tab', { name: 'Progress' }));
  expect(onOpen).toHaveBeenCalledWith('c');
  expect(screen.queryByLabelText('New words to review')).toBeNull();
});

test('a tap on the open tab does nothing; the red dot shows on Review when asked', async () => {
  const onOpen = jest.fn();
  await render(<WebTabBar state={state(2)} dot onOpen={onOpen} />);
  await fireEvent.press(screen.getByRole('tab', { name: 'Progress' }));
  expect(onOpen).not.toHaveBeenCalled();
  expect(screen.getByLabelText('New words to review')).toBeOnTheScreen();
});

test('the label keeps its whole line, so letters under the line (g, p) are not cut', async () => {
  await render(<WebTabBar state={state(0)} dot={false} onOpen={jest.fn()} />);
  const label = screen.getByText('Progress');
  const style = Object.assign({}, ...[label.props.style].flat(3).filter(Boolean));
  expect(style.lineHeight).toBeGreaterThanOrEqual(style.fontSize + 4);
});
