// What Kai can do in the New words chat beyond talking. Each ability lives in its own file and adds one line here,
// so two sessions working at the same time do not edit the same lines (docs/parallel-work.md).
//
// An ability adds: an optional field on Kai's answer (Zod shape), a part of the prompt, facts for the context,
// and what the server saves when the field comes back. See openspec/changes/new-words-decks and new-words-single-words.
export * as words from './words.js';
