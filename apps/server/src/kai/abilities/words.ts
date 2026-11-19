import { z } from 'zod';

// Ability: Kai answers "how do I say…?" with a word card the learner can keep.
// The card rides on Kai's answer as `word` and is saved with Kai's last line of the turn.
// Adding it to a "Random Words N" deck is in src/decks/random-words.ts.

export const MAX_WORD_CHARS = 60;
// Plain text: bold marks the model adds anyway are taken out before the length is checked.
const plain = (max: number) =>
  z
    .string()
    .transform((t) => t.replaceAll('**', '').trim())
    .pipe(z.string().min(1).max(max));
export const KaiWordSchema = z.object({
  word: plain(MAX_WORD_CHARS),
  translation: plain(120),
  example: z.string().trim().min(1).max(300), // the word may be marked **like this**; the card shows it green
  exampleTranslation: plain(300),
});
export type KaiWord = z.infer<typeof KaiWordSchema>;
// What a chat message shows: the word, the deck that would take it now (or took it), and what happened to it.
export type KaiMessageWord = KaiWord & { addTo: string; added: boolean; already: boolean };

// A card's example is plain text.
export const cardExample = (example: string) => example.replaceAll('**', '');

// One history line as Kai is told it: a line that had a card also says which word, so "another way to say it" has something to go on.
export const wordInHistory = (text: string, word: KaiWord | undefined) => (word ? `${text} [word card: ${word.word} = ${word.translation}]` : text);

// L = the learning language, N = the learner's own language.
export function wordPromptPart(L: string, N: string): string[] {
  return [
    `Word cards:`,
    `- Give a word card when the learner asks how to say something in ${L}, asks what a word means, or names a word they want to keep. Then write 1 short line and set "word": {"word", "translation", "example", "exampleTranslation"}.`,
    `- "word": the ${L} word or short phrase (at most ${MAX_WORD_CHARS} characters), as a dictionary shows it (nouns with their article where ${L} has one). "translation": its meaning in ${N}, short. "example": one natural, simple sentence in ${L} that uses the word, with the word marked in **bold**. "exampleTranslation": that sentence in ${N}, plain text.`,
    `- One card per answer, for the most useful word. Every other language question (grammar, the difference between two words, culture) gets a short answer with no card: leave "word" null.`,
    `- The four card fields have no emoji. Only "example" has bold marks.`,
    `- After a word card you may give the one option that means "Another way to say it" in ${L}. When the learner says or taps that, answer with a new card: a different ${L} word or phrase with the same meaning as the last card (never the same word again). If there is no other common way, say so in one line with no card.`,
    `- In the chat so far, "[word card: …]" after one of your lines is the card you gave then. Never write that mark yourself.`,
    `- Now and then, not often, remind the learner in one short line that they can ask you how to say something.`,
  ];
}
export const WORD_SHAPE = `"word": {"word": string, "translation": string, "example": string, "exampleTranslation": string} | null`;

// The stand-in AI: a card when the text asks how to say something or what a word means. Always the same word.
const asksForWord = /how do i say|c[oó]mo se dice|what does .+ mean|qu[eé] significa|otra forma/i;
export function fixtureWordAnswer(text: string) {
  if (!asksForWord.test(text)) return null;
  return {
    lines: [{ text: 'Se dice **para llevar** 🥡', translation: 'You say “para llevar”' }],
    word: { word: 'para llevar', translation: 'to go (takeaway)', example: 'Un café **para llevar**, por favor.', exampleTranslation: 'A coffee to go, please.' },
    options: ['Otra forma de decirlo'],
  };
}
