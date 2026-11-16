// Tests for the picture-sheet functions (lib/sheet.mjs): in-memory blob store, mocked OpenAI. No network.
//   npm test
import { test } from "node:test";
import assert from "node:assert/strict";
import { makeBackground, makeStatus, sheetPrompt, cleanId, cleanScenes, cleanup, dayOf, STALE_MS, RATE } from "../lib/sheet.mjs";

// Minimal stand-in for @netlify/blobs getStore(): get / getWithMetadata / set / setJSON / list / delete
function memStore() {
  const m = new Map();
  const store = {
    m,
    async get(k, o = {}) { if (!m.has(k)) return null; const v = m.get(k).data; return o.type === "json" ? JSON.parse(typeof v === "string" ? v : Buffer.from(v).toString()) : typeof v === "string" ? v : Buffer.from(v).toString(); },
    async getWithMetadata(k, o = {}) { if (!m.has(k)) return null; const { data, metadata } = m.get(k); return { data: o.type === "arrayBuffer" ? new Uint8Array(data).buffer : data, metadata }; },
    async set(k, data, o = {}) { m.set(k, { data: typeof data === "string" ? data : Buffer.from(data), metadata: o.metadata || {} }); },
    async setJSON(k, v) { m.set(k, { data: JSON.stringify(v), metadata: {} }); },
    async list({ prefix = "" } = {}) { return { blobs: [...m.keys()].filter(k => k.startsWith(prefix)).map(key => ({ key })) }; },
    async delete(k) { m.delete(k); }
  };
  return { store, getStore: opts => { assert.equal(opts.name, "deck-images"); assert.equal(opts.consistency, "strong"); return store; } };
}
// A fake webp (RIFF....WEBP header + filler) as the OpenAI response
const WEBP = Buffer.concat([Buffer.from("RIFF"), Buffer.alloc(4), Buffer.from("WEBPVP8 "), Buffer.alloc(5000, 7)]);
const PNG = Buffer.concat([Buffer.from([0x89]), Buffer.from("PNG\r\n\x1a\n"), Buffer.alloc(5000, 3)]);
function mockOpenAI(script) {
  const calls = [];
  const fn = async (url, init) => {
    calls.push({ url, body: JSON.parse(init.body), auth: init.headers.authorization });
    const step = script[Math.min(calls.length - 1, script.length - 1)];
    if (step.throw) throw step.throw;
    return new Response(JSON.stringify(step.body), { status: step.status || 200, headers: { "content-type": "application/json" } });
  };
  fn.calls = calls;
  return fn;
}
const NOW = Date.UTC(2026, 10, 1, 12, 0, 0);
const ID = dayOf(NOW) + "-abc123def456xyz";
const SCENES = Array.from({ length: 10 }, (_, i) => `scene number ${i + 1}: a person doing thing ${i + 1}`);
const post = (body, ip = "1.2.3.4") => new Request("https://x.test/.netlify/functions/lw-img-background", { method: "POST", body: JSON.stringify(body), headers: { "content-type": "application/json", "x-nf-client-connection-ip": ip } });
const get = qs => new Request("https://x.test/api/img?" + qs);
const env = { OPENAI_API_KEY: "sk-test" };

test("prompt: 12 frames, 3 x 4 grid, rows in order, empty 11-12, style + colour rule", () => {
  const p = sheetPrompt(SCENES);
  assert.match(p, /exact grid of 3 columns and 4 rows/);
  assert.match(p, /No text, no numbers, no letters/);
  assert.match(p, /Row 1, left to right: \(1\) scene number 1[^;]*; \(2\) scene number 2[^;]*; \(3\) scene number 3/);
  assert.match(p, /Row 4, left to right: \(10\) scene number 10[^;]*; \(11\) an empty plain off-white panel[^;]*; \(12\) an empty plain off-white panel/);
  assert.match(p, /Food, objects and clothes also only in near-black, white, light gray and green/);
});

test("input checks", () => {
  assert.equal(cleanId(ID, NOW, true), ID);
  assert.equal(cleanId("20200101-abc123def456xyz", NOW, true), "");   // too old for a new job
  assert.equal(cleanId("20200101-abc123def456xyz", NOW, false), "20200101-abc123def456xyz");   // still readable
  assert.equal(cleanId("../etc-passwd", NOW), "");
  assert.equal(cleanId(dayOf(NOW) + "-SHORT", NOW), "");
  assert.equal(cleanScenes(SCENES.slice(0, 9)), null);
  assert.equal(cleanScenes([...SCENES, "a", "b", "c"]), null);
  assert.equal(cleanScenes([...SCENES.slice(0, 9), "x".repeat(201)]), null);
  assert.equal(cleanScenes([...SCENES.slice(0, 9), 5]), null);
  assert.deepEqual(cleanScenes([...SCENES.slice(0, 9), "  a\n cat \u0000 "]).at(-1), "a cat");
});

test("background: makes the sheet, stores image + ready job; status serves it", async () => {
  const { store, getStore } = memStore();
  const fetch = mockOpenAI([{ body: { data: [{ b64_json: WEBP.toString("base64") }] } }]);
  const bg = makeBackground({ getStore, fetch, env, now: () => NOW, cleanupEvery: 0 });
  const r = await bg(post({ id: ID, scenes: SCENES }));
  assert.equal(r.status, 200);
  assert.equal(fetch.calls.length, 1);
  const c = fetch.calls[0];
  assert.equal(c.url, "https://api.openai.com/v1/images/generations");
  assert.equal(c.auth, "Bearer sk-test");
  assert.equal(c.body.model, "gpt-image-2.5-sunburst");
  assert.equal(c.body.size, "1536x1024");
  assert.equal(c.body.quality, "medium");
  assert.equal(c.body.n, 1);
  assert.equal(c.body.output_format, "webp");
  assert.match(c.body.prompt, /\(10\) scene number 10/);
  const job = await store.get(ID + ".json", { type: "json" });
  assert.equal(job.status, "ready"); assert.equal(job.type, "image/webp");

  const st = makeStatus({ getStore, env, now: () => NOW + 1000 });
  const s = await (await st(get("id=" + ID))).json();
  assert.deepEqual([s.status, s.url], ["ready", `/api/img?id=${ID}&img=1`]);
  const img = await st(get(`id=${ID}&img=1`));
  assert.equal(img.status, 200);
  assert.equal(img.headers.get("content-type"), "image/webp");
  assert.match(img.headers.get("cache-control"), /immutable/);
  assert.deepEqual(Buffer.from(await img.arrayBuffer()), WEBP);
});

test("background: same id twice runs once", async () => {
  const { getStore } = memStore();
  const fetch = mockOpenAI([{ body: { data: [{ b64_json: WEBP.toString("base64") }] } }]);
  const bg = makeBackground({ getStore, fetch, env, now: () => NOW, cleanupEvery: 0 });
  await bg(post({ id: ID, scenes: SCENES }));
  const again = await (await bg(post({ id: ID, scenes: SCENES }))).json();
  assert.equal(again.again, 1);
  assert.equal(fetch.calls.length, 1);
});

test("background: webp refused → asks again for png", async () => {
  const { store, getStore } = memStore();
  const fetch = mockOpenAI([
    { status: 400, body: { error: { message: "Unknown parameter: 'output_format'." } } },
    { body: { data: [{ b64_json: PNG.toString("base64") }] } }
  ]);
  await makeBackground({ getStore, fetch, env, now: () => NOW, cleanupEvery: 0 })(post({ id: ID, scenes: SCENES }));
  assert.equal(fetch.calls.length, 2);
  assert.equal(fetch.calls[1].body.output_format, undefined);
  const job = await store.get(ID + ".json", { type: "json" });
  assert.equal(job.status, "ready"); assert.equal(job.type, "image/png");
});

test("background: OpenAI error / timeout / bad image → error job; status says error", async () => {
  for (const [script, want] of [
    [[{ status: 500, body: { error: { message: "server" } } }], "openai"],
    [[{ status: 429, body: { error: { message: "rate" } } }], "busy"],
    [[{ throw: Object.assign(new Error("t"), { name: "TimeoutError" }) }], "timeout"],
    [[{ body: { data: [{ b64_json: Buffer.from("not an image at all").toString("base64") }] } }], "bad_image"],
    [[{ body: { data: [] } }], "empty"]
  ]) {
    const { getStore } = memStore();
    await makeBackground({ getStore, fetch: mockOpenAI(script), env, now: () => NOW, cleanupEvery: 0 })(post({ id: ID, scenes: SCENES }));
    const s = await (await makeStatus({ getStore, env, now: () => NOW })(get("id=" + ID))).json();
    assert.deepEqual([s.status, s.error], ["error", want]);
  }
});

test("background: no key / bad input / bad id never call OpenAI", async () => {
  const { store, getStore } = memStore();
  const fetch = mockOpenAI([{ body: {} }]);
  await makeBackground({ getStore, fetch, env: {}, now: () => NOW })(post({ id: ID, scenes: SCENES }));
  assert.equal((await store.get(ID + ".json", { type: "json" })).error, "no_key");
  const id2 = dayOf(NOW) + "-zzzzzzzzzzzz2";
  await makeBackground({ getStore, fetch, env, now: () => NOW })(post({ id: id2, scenes: ["too", "few"] }));
  assert.equal((await store.get(id2 + ".json", { type: "json" })).error, "bad_input");
  const r = await makeBackground({ getStore, fetch, env, now: () => NOW })(post({ id: "nope", scenes: SCENES }));
  assert.equal(r.status, 400);
  assert.equal(fetch.calls.length, 0);
});

test("background: rate limit 6 per IP per 10 min, then free again", async () => {
  const { store, getStore } = memStore();
  const fetch = mockOpenAI([{ body: { data: [{ b64_json: WEBP.toString("base64") }] } }]);
  let t = NOW;
  const bg = makeBackground({ getStore, fetch, env, now: () => t, cleanupEvery: 0 });
  const id = n => `${dayOf(NOW)}-ratetest${String(n).padStart(6, "0")}`;
  for (let n = 0; n < RATE.max; n++) await bg(post({ id: id(n), scenes: SCENES }));
  await bg(post({ id: id(99), scenes: SCENES }));
  assert.equal((await store.get(id(99) + ".json", { type: "json" })).error, "rate");
  await bg(post({ id: id(98), scenes: SCENES }, "5.6.7.8"));   // another IP is fine
  assert.equal((await store.get(id(98) + ".json", { type: "json" })).status, "ready");
  t = NOW + RATE.ms + 1;
  await bg(post({ id: id(97), scenes: SCENES }));
  assert.equal((await store.get(id(97) + ".json", { type: "json" })).status, "ready");
  assert.equal(fetch.calls.length, RATE.max + 2);
});

test("background: daily cap (IMG_DAILY_MAX)", async () => {
  const { store, getStore } = memStore();
  const fetch = mockOpenAI([{ body: { data: [{ b64_json: WEBP.toString("base64") }] } }]);
  process.env.IMG_DAILY_MAX = "2";
  try {
    const bg = makeBackground({ getStore, fetch, env, now: () => NOW, cleanupEvery: 0 });
    for (let n = 0; n < 3; n++) await bg(post({ id: `${dayOf(NOW)}-captest00000${n}`, scenes: SCENES }, "9.9.9." + n));
    assert.equal((await store.get(`${dayOf(NOW)}-captest000002.json`, { type: "json" })).error, "cap");
    assert.equal(fetch.calls.length, 2);
  } finally { delete process.env.IMG_DAILY_MAX; }
});

test("status: pending, unknown, stale, no key, bad id, missing image", async () => {
  const { store, getStore } = memStore();
  const st = t => makeStatus({ getStore, env, now: () => t });
  assert.deepEqual(await (await st(NOW)(get("id=" + ID))).json(), { status: "pending", seen: 0 });
  await store.setJSON(ID + ".json", { status: "pending", t: NOW });
  assert.deepEqual(await (await st(NOW + 5000)(get("id=" + ID))).json(), { status: "pending", seen: 1 });
  assert.equal((await (await st(NOW + STALE_MS + 1)(get("id=" + ID))).json()).error, "stale");
  const nk = await makeStatus({ getStore, env: {} })(get("id=" + ID));
  assert.equal(nk.status, 503); assert.equal((await nk.json()).error, "no_key");
  assert.equal((await st(NOW)(get("id=../x"))).status, 400);
  assert.equal((await st(NOW)(get(`id=${ID}&img=1`))).status, 404);
  assert.equal((await st(NOW)(new Request("https://x.test/api/img?id=" + ID, { method: "POST", body: "{}" }))).status, 405);
});

test("cleanup deletes only days past KEEP_DAYS", async () => {
  const { store } = memStore();
  const old = dayOf(NOW - 15 * 864e5) + "-oldoldoldold1", fresh = dayOf(NOW - 2 * 864e5) + "-newnewnewnew1";
  for (const k of [old + ".json", old + ".img", fresh + ".json", fresh + ".img"]) await store.set(k, "x");
  await store.set("n/" + dayOf(NOW - 15 * 864e5), "3");
  const n = await cleanup(store, NOW);
  assert.equal(n, 3);
  assert.deepEqual([...store.m.keys()].sort(), [fresh + ".img", fresh + ".json"]);
});
