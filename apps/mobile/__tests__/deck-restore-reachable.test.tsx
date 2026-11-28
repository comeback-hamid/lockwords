import { fireEvent, render, screen, waitFor } from '@testing-library/react-native';

import type { Deck } from '@/api/client';
import DeckScreen from '@/app/deck/[id]';
import { api } from '@/auth/boot';

// On iOS an `accessible` view hides every control inside it from screen readers and test tools.
// The Restore button of a known word must not sit inside the row's `accessible` block (found by Maestro, 2026-11-27).
jest.mock('expo-router', () => ({ Stack: { Screen: () => null }, useRouter: () => ({ push: jest.fn(), replace: jest.fn(), back: jest.fn() }), useLocalSearchParams: () => ({ id: 'd1' }) }));
jest.mock('@/auth/boot', () => ({ api: { fetchDeck: jest.fn(), removeCard: jest.fn(), removeDeck: jest.fn(), restoreCard: jest.fn(), fetchRound: jest.fn() } }));
jest.mock('react-native-safe-area-context', () => ({ useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }) }));

const deck: Deck = {
  id: 'd1', topic: 'Ordering food', title: 't', titleTranslation: null, reason: 'r', cefr: 'A1', kind: 'topic', wordCount: 2, status: 'ready',
  cards: [
    { id: 'c0', position: 0, word: 'pedir', translation: 'to order', example: 'e', exampleTranslation: 'et', stage: 1 },
    { id: 'c1', position: 1, word: 'la propina', translation: 'the tip', example: 'e', exampleTranslation: 'et', stage: 0, known: true },
  ],
};

test('the Restore button is not inside an accessible block, so iOS shows it to screen readers and tests', async () => {
  jest.mocked(api.fetchDeck).mockResolvedValue(deck);
  await render(<DeckScreen />);
  await waitFor(() => expect(screen.getByRole('header', { name: 'Ordering food' })).toBeOnTheScreen());
  await fireEvent.press(screen.getByRole('button', { name: 'Known 1' }));
  const restore = screen.getByRole('button', { name: 'Restore la propina' });
  for (let node = restore.parent; node; node = node.parent) {
    expect(node.props.accessible).not.toBe(true);
  }
});
