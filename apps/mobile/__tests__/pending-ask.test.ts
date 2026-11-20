import { askKaiLater, deckAsk, hasPendingAsk, takePendingAsk } from '@/new-words/pending';

test('one message waits, is read once, and the newest wins', () => {
  expect(takePendingAsk()).toBeNull();
  askKaiLater('first');
  askKaiLater(deckAsk('At the hotel'));
  expect(hasPendingAsk()).toBe(true);
  expect(takePendingAsk()).toBe('A deck about At the hotel');
  expect(hasPendingAsk()).toBe(false);
  expect(takePendingAsk()).toBeNull();
});
