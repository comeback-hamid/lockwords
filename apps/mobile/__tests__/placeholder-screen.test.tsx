import { render, screen } from '@testing-library/react-native';

import { PlaceholderScreen } from '@/components/placeholder-screen';

test('shows the screen title as a header', async () => {
  await render(<PlaceholderScreen title="Review" />);
  expect(screen.getByRole('header', { name: 'Review' })).toBeOnTheScreen();
});
