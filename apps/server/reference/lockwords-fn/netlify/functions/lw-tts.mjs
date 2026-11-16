// Lockwords funnel v3: pronunciation. GET /api/tts?l=<code>&t=<word>  -> audio/mpeg (see lib/tts.mjs)
import { getStore } from "@netlify/blobs";
import { makeTts } from "../../lib/tts.mjs";

export default makeTts({ getStore });
export const config = { path: "/api/tts" };
