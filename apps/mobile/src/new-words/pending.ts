// A message another screen wants the New words chat to send to Kai (a deck idea tapped in the word plan on the
// Progress tab). It waits here until the New words tab is open and Kai is quiet. One at a time; the newest wins.
let pending: string | null = null;

export const askKaiLater = (text: string) => {
  pending = text;
};
export const hasPendingAsk = () => pending !== null;
// Reads the message and clears it.
export function takePendingAsk(): string | null {
  const text = pending;
  pending = null;
  return text;
}
export const deckAsk = (topic: string) => `A deck about ${topic}`;
