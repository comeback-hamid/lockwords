// Picture sheets for funnel v3 decks: one OpenAI image per deck, 3 columns x 4 rows of equal 2:1 frames on 1536x1024
// (each frame 512x256). Frames 1-10 = the deck's 10 words in order (left to right, top to bottom), 11-12 empty.
// Shared by lw-img-background.mjs (makes the sheet) and lw-img.mjs (status + image). Handlers are built by make*()
// so tests can pass an in-memory store and a mocked fetch.
//
// Blob store "deck-images" (strong consistency), keys per job id ("YYYYMMDD-<random>", made by the page):
//   <id>.json  {status: pending|ready|error, t, error?, type?, ms?, bytes?}
//   <id>.img   the image (webp, or png if the API refuses webp), metadata {type}
//   rl/<hash of IP>   recent start times (rate limit)      n/<YYYYMMDD>   sheets started that day (daily cap)
import { createHash } from "node:crypto";

export const STORE = "deck-images";
export const MODEL = "gpt-image-2.5-sunburst";
export const API = "https://api.openai.com/v1/images/generations";
export const RATE = { max: 6, ms: 10 * 60 * 1000 };   // sheets per IP per 10 minutes
export const STALE_MS = 150 * 1000;                     // a job still pending after this is reported as an error
export const KEEP_DAYS = 14;                            // jobs and images older than this are deleted (now and then)
const DAILY_MAX = () => Math.max(0, parseInt(process.env.IMG_DAILY_MAX || "1500", 10) || 0);   // cost guard: ~5 ¢ per sheet

// Keep in step with tools/deck-sheets.mjs in the funnel (the ready-made topic sheets use the same prompt)
export const STYLE = "Minimal flat line illustration in a clean doodle style. Uniform near-black outlines (#1f2328), medium even weight, rounded line ends, smooth and steady hand-drawn lines; simple closed shapes. Flat fills only: no shading, no gradients, no texture, no shadows. Palette limited to near-black, white and light gray (#e6e9ec, #d1d9e0) on an off-white background (#f6f8fa), plus one green accent in #1f883d / #2da44e / #4ac26b with a very light green (#aceebb) for soft highlights. Green is used sparingly: one key object and 3–5 short dash strokes radiating around it. Simple cartoon people: solid flat black hair, small dot eyes, short eyebrow lines, simple expressive mouths, clothes in flat light gray or white with black outline. Speech bubbles and props drawn with the same outline weight. Generous white space, uncluttered, centered composition. Food, objects and clothes also only in near-black, white, light gray and green — no other colours.";
export const EMPTY = "an empty plain off-white panel with nothing in it";

export function sheetPrompt(scenes) {
  const s = scenes.slice(0, 12);
  while (s.length < 12) s.push(EMPTY);
  const rows = [0, 1, 2, 3].map(r => `Row ${r + 1}, left to right: ${[0, 1, 2].map(c => `(${r * 3 + c + 1}) ${s[r * 3 + c]}`).join("; ")}.`).join(" ");
  return "A sprite sheet of 12 separate small illustrations in an exact grid of 3 columns and 4 rows, all panels the same size, " +
    "each a wide 2:1 frame, thin even off-white gutters, each scene centered inside its own panel and not crossing into neighbours. " +
    "No text, no numbers, no letters, no labels anywhere. " + rows + " Style for every panel: " + STYLE;
}

// ---- input checks ----
const ID_RE = /^(\d{8})-([a-z0-9]{12,32})$/;
export const dayOf = ms => new Date(ms).toISOString().slice(0, 10).replace(/-/g, "");
// Job id from the page: "YYYYMMDD-<12-32 lowercase letters/digits>". The date (UTC) lets old jobs be deleted by prefix.
export function cleanId(v, now = Date.now(), checkDate = false) {
  const m = typeof v === "string" && v.match(ID_RE);
  if (!m) return "";
  if (checkDate) {   // a new job: the date must be close to today (allows for wrong phone clocks of a day or two)
    const days = [-3, -2, -1, 0, 1, 2].map(d => dayOf(now + d * 864e5));
    if (!days.includes(m[1])) return "";
  }
  return v;
}
// Scenes: 10 to 12 short English descriptions. Anything else → null (the job is refused).
export function cleanScenes(v) {
  if (!Array.isArray(v) || v.length < 10 || v.length > 12) return null;
  const out = v.map(x => (typeof x === "string" ? x.replace(/[\u0000-\u001f\u007f]/g, " ").replace(/\s+/g, " ").trim() : ""));
  if (out.some(x => x.length < 3 || x.length > 200)) return null;
  return out;
}
export const clientIp = (req, ctx) => (ctx && ctx.ip) || req.headers.get("x-nf-client-connection-ip") || (req.headers.get("x-forwarded-for") || "").split(",")[0].trim() || "unknown";
const ipKey = ip => "rl/" + createHash("sha256").update("lw-img:" + ip).digest("hex").slice(0, 24);
const json = (body, status = 200) => new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json", "cache-control": "no-store" } });

// Best effort (read-modify-write, no lock): good enough to stop one visitor from making many sheets.
async function rateLimited(store, ip, now) {
  const k = ipKey(ip), a = ((await store.get(k, { type: "json" })) || []).filter(t => typeof t === "number" && now - t < RATE.ms);
  if (a.length >= RATE.max) return true;
  a.push(now); await store.setJSON(k, a);
  return false;
}
async function overDailyCap(store, now) {
  const max = DAILY_MAX(), k = "n/" + dayOf(now), n = Number(await store.get(k)) || 0;
  if (n >= max) return true;
  await store.set(k, String(n + 1));
  return false;
}
const imgType = b => (b.length > 12 && b.toString("ascii", 0, 4) === "RIFF" && b.toString("ascii", 8, 12) === "WEBP") ? "image/webp"
  : (b.length > 8 && b[0] === 0x89 && b.toString("ascii", 1, 4) === "PNG") ? "image/png"
  : (b.length > 3 && b[0] === 0xff && b[1] === 0xd8) ? "image/jpeg" : "";

// One call to the OpenAI Images API. Asks for webp (smaller); if the model refuses that option, asks again for png.
async function callOpenAI(fetchFn, key, prompt, timeoutMs) {
  const body = { model: MODEL, prompt, n: 1, size: "1536x1024", quality: "medium", output_format: "webp", output_compression: 80 };
  for (let attempt = 0; attempt < 2; attempt++) {
    const r = await fetchFn(API, { method: "POST", headers: { authorization: "Bearer " + key, "content-type": "application/json" }, body: JSON.stringify(body), signal: AbortSignal.timeout(timeoutMs) });
    const j = await r.json().catch(() => ({}));
    if (r.ok) {
      const b64 = j && j.data && j.data[0] && j.data[0].b64_json;
      if (!b64) throw Object.assign(new Error("no image"), { code: "empty" });
      return Buffer.from(b64, "base64");
    }
    const msg = String((j && j.error && j.error.message) || "");
    if (attempt === 0 && r.status === 400 && /output_(format|compression)/i.test(msg)) { delete body.output_format; delete body.output_compression; continue; }
    throw Object.assign(new Error("openai " + r.status + ": " + msg.slice(0, 200)), { code: r.status === 429 ? "busy" : "openai", status: r.status });
  }
}

// Delete jobs and images of a few days just past KEEP_DAYS (runs now and then, after a job).
export async function cleanup(store, now = Date.now()) {
  let n = 0;
  for (let d = KEEP_DAYS; d < KEEP_DAYS + 5; d++) {
    const { blobs } = await store.list({ prefix: dayOf(now - d * 864e5) + "-" });
    for (const b of blobs.slice(0, 400)) { await store.delete(b.key); n++; }
    const old = "n/" + dayOf(now - d * 864e5); if (await store.get(old)) { await store.delete(old); n++; }
  }
  return n;
}

// POST /.netlify/functions/lw-img-background {id, scenes[10]} → Netlify answers 202 at once; this runs up to 15 min.
// The result is read with lw-img (GET /api/img?id=…).
export function makeBackground({ getStore, fetch: fetchFn = fetch, env = process.env, now = () => Date.now(), timeoutMs = 120000, cleanupEvery = 25 } = {}) {
  return async (req, ctx) => {
    if (req.method !== "POST") return json({ error: "method" }, 405);
    let b; try { b = await req.json(); } catch { return json({ error: "bad_json" }, 400); }
    const id = cleanId(b && b.id, now(), true);
    if (!id) return json({ error: "id" }, 400);
    const store = getStore({ name: STORE, consistency: "strong" }), jk = id + ".json", t = now();
    if (await store.get(jk)) return json({ ok: 1, again: 1 });   // already started (the page may send twice)
    const fail = async (error, extra = {}) => { await store.setJSON(jk, Object.assign({ status: "error", error, t }, extra)); return json({ error }, 200); };
    if (!env.OPENAI_API_KEY) return fail("no_key");
    const scenes = cleanScenes(b.scenes);
    if (!scenes) return fail("bad_input");
    if (await rateLimited(store, clientIp(req, ctx), t)) return fail("rate");
    if (await overDailyCap(store, t)) return fail("cap");
    await store.setJSON(jk, { status: "pending", t });
    try {
      const img = await callOpenAI(fetchFn, env.OPENAI_API_KEY, sheetPrompt(scenes), timeoutMs);
      const type = imgType(img);
      if (!type || img.length < 2000) return fail("bad_image", { bytes: img.length });
      await store.set(id + ".img", img, { metadata: { type } });
      await store.setJSON(jk, { status: "ready", t, type, ms: now() - t, bytes: img.length });
    } catch (e) {
      console.error("lw-img", id, e && e.message);
      return fail(e && e.name === "TimeoutError" ? "timeout" : (e && e.code) || "failed", e && e.status ? { code: e.status } : {});
    }
    if (cleanupEvery && Math.random() < 1 / cleanupEvery) { try { await cleanup(store, t); } catch (e) { console.error("lw-img cleanup", e && e.message); } }
    return json({ ok: 1 });
  };
}

// GET /api/img?id=…        → {status: pending|ready|error, url?, error?}
// GET /api/img?id=…&img=1  → the image itself (cached for a year: the id never changes)
export function makeStatus({ getStore, env = process.env, now = () => Date.now() } = {}) {
  return async req => {
    if (req.method !== "GET") return json({ error: "method" }, 405);
    const u = new URL(req.url), id = cleanId(u.searchParams.get("id"));
    if (!id) return json({ status: "error", error: "id" }, 400);
    const wantImg = !!u.searchParams.get("img");
    if (!wantImg && !env.OPENAI_API_KEY) return json({ status: "error", error: "no_key" }, 503);
    let store;
    try { store = getStore({ name: STORE, consistency: "strong" }); } catch (e) { return json({ status: "error", error: "store" }, 500); }
    if (wantImg) {
      const r = await store.getWithMetadata(id + ".img", { type: "arrayBuffer" });
      if (!r || !r.data) return new Response("not found", { status: 404, headers: { "cache-control": "no-store" } });
      return new Response(r.data, { status: 200, headers: { "content-type": (r.metadata && r.metadata.type) || "image/webp", "cache-control": "public, max-age=31536000, immutable" } });
    }
    const job = await store.get(id + ".json", { type: "json" });
    if (!job) return json({ status: "pending", seen: 0 });   // the background function has not written it yet
    if (job.status === "ready") return json({ status: "ready", url: `/api/img?id=${id}&img=1`, ms: job.ms });
    if (job.status === "pending" && now() - job.t > STALE_MS) return json({ status: "error", error: "stale" });
    if (job.status === "pending") return json({ status: "pending", seen: 1 });
    return json({ status: "error", error: job.error || "failed" });
  };
}
