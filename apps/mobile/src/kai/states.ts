import spec from './character-spec.json';

// Every chat-form state in Kai's spec (idle, greeting, listening, thinking, speaking, making, celebrate, waiting, oops, …).
export type KaiState = keyof typeof spec.chat.states;
