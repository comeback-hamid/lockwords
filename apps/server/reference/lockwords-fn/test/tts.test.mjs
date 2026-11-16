// Tests for the pronunciation function (lib/tts.mjs): in-memory blob store, mocked OpenAI. No network.
import { test } from "node:test";
import assert from "node:assert/strict";
import { makeTts, cleanText, langOf, keyOf, RATE, MODEL, VOICE } from "../lib/tts.mjs";

function memStore() {
  const m = new Map();
  return { m, getStore: o => { assert.equal(o.name, "tts"); return { async get(k) { return m.has(k) ? m.get(k).buffer.slice(0) : null; }, async set(k, v) { m.set(k, new Uint8Array(v)); } }; } };
}
const MP3 = new Uint8Array(3000).fill(9);
function mockOpenAI(status = 200) {
  const calls = [];
  const fn = async (url, init) => { calls.push({ url, body: JSON.parse(init.body), auth: init.headers.authorization }); return new Response(status === 200 ? MP3 : "{}", { status }); };
  fn.calls = calls;
  return fn;
}
const get = (qs, ip = "1.2.3.4") => new Request("https://x.test/api/tts?" + qs, { headers: { "x-nf-client-connection-ip": ip } });
const env = { OPENAI_API_KEY: "sk-test" };

test("cleanText and langOf", () => {
  assert.equal(cleanText("  la *propina*\n "), "la propina");
  assert.equal(cleanText("x".repeat(200)).length, 80);
  assert.equal(langOf("ja"), "Japanese");
  assert.equal(langOf("xx", "Svenska"), "Svenska");
  assert.equal(langOf("", "evil\"; drop"), "");
  assert.equal(langOf("", ""), "");
});

test("makes a clip once, then serves it from the store", async () => {
  const s = memStore(), f = mockOpenAI(), h = makeTts({ getStore: s.getStore, fetch: f, env });
  const r1 = await h(get("l=es&t=" + encodeURIComponent("la propina")));
  assert.equal(r1.status, 200);
  assert.equal(r1.headers.get("content-type"), "audio/mpeg");
  assert.match(r1.headers.get("cache-control"), /max-age=31536000/);
  assert.equal((await r1.arrayBuffer()).byteLength, MP3.byteLength);
  assert.equal(f.calls.length, 1);
  assert.equal(f.calls[0].body.model, MODEL);
  assert.equal(f.calls[0].body.voice, VOICE);
  assert.equal(f.calls[0].body.input, "la propina");
  assert.match(f.calls[0].body.instructions, /Spanish/);
  assert.equal(f.calls[0].auth, "Bearer sk-test");
  assert.ok(s.m.has(keyOf("Spanish", "la propina")));
  const r2 = await h(get("l=es&t=la%20propina"));
  assert.equal(r2.status, 200);
  assert.equal(f.calls.length, 1, "second call is served from the store");
});

test("typed language by name; bad input", async () => {
  const s = memStore(), f = mockOpenAI(), h = makeTts({ getStore: s.getStore, fetch: f, env });
  assert.equal((await h(get("n=Svenska&t=hej"))).status, 200);
  assert.match(f.calls[0].body.instructions, /Svenska/);
  assert.equal((await h(get("l=es&t="))).status, 400);
  assert.equal((await h(get("l=zz&t=hola"))).status, 400);
  assert.equal((await h(new Request("https://x.test/api/tts?l=es&t=hola", { method: "POST" }))).status, 405);
});

test("no key, API error, rate limit", async () => {
  const s = memStore();
  assert.equal((await makeTts({ getStore: s.getStore, fetch: mockOpenAI(), env: {} })(get("l=es&t=hola"))).status, 503);
  assert.equal((await makeTts({ getStore: s.getStore, fetch: mockOpenAI(500), env })(get("l=es&t=hola"))).status, 502);
  const h = makeTts({ getStore: memStore().getStore, fetch: mockOpenAI(), env });
  for (let i = 0; i < RATE.max; i++) assert.equal((await h(get("l=es&t=w" + i, "9.9.9.9"))).status, 200);
  assert.equal((await h(get("l=es&t=one-more", "9.9.9.9"))).status, 429);
  assert.equal((await h(get("l=es&t=w1", "9.9.9.9"))).status, 200, "cached clips are never limited");
  assert.equal((await h(get("l=es&t=other-ip", "8.8.8.8"))).status, 200);
});

test("daily cap", async () => {
  const h = makeTts({ getStore: memStore().getStore, fetch: mockOpenAI(), env: { ...env, TTS_DAILY_MAX: "2" } });
  assert.equal((await h(get("l=es&t=a", "1.1.1.1"))).status, 200);
  assert.equal((await h(get("l=es&t=b", "1.1.1.2"))).status, 200);
  assert.equal((await h(get("l=es&t=c", "1.1.1.3"))).status, 429);
});
