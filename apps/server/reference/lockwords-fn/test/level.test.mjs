// Deck level bands (lib/level.mjs). Keep in step with deckBand() in funnel/v3/index.html.
import { test } from "node:test";
import assert from "node:assert/strict";
import { deckBand, deckMix } from "../lib/level.mjs";

test("bands", () => {
  assert.equal(deckBand("a0", null), 0);
  assert.equal(deckBand("a0", 4000), 0, "A0 never takes the word test");
  assert.equal(deckBand("b2", 300), 1, "the estimate wins over the self-rating");
  assert.equal(deckBand("a1", 1000), 2);
  assert.equal(deckBand("a1", 3000), 3);
  assert.equal(deckBand("a2", 4700), 4);
  assert.equal(deckBand("a1", null), 1);
  assert.equal(deckBand("b2", null), 4);
  assert.equal(deckBand(undefined, null), 2);
});

test("mix text", () => {
  assert.match(deckMix("b2", 4700), /about 4,700 of the 5,000/);
  assert.match(deckMix("b2", 4700), /never words like train, ticket/);
  assert.match(deckMix("b2", 5000), /nearly all/);
  assert.match(deckMix("a1", 1000), /about 3 easy items/);
  assert.match(deckMix("a0", null), /starting from zero/);
  assert.doesNotMatch(deckMix("a0", null), /about 3 easy items/);
});
