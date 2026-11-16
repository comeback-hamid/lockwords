// Lockwords funnel v3: makes one picture sheet per deck (OpenAI Images, ~25 s) as a Netlify BACKGROUND function
// (the name must end in "-background": Netlify answers 202 at once and lets it run up to 15 minutes).
//   POST /.netlify/functions/lw-img-background {id: "YYYYMMDD-<random>", scenes: [10 short English scenes]}
// The page then polls GET /api/img?id=… (lw-img.mjs). Needs OPENAI_API_KEY in the site env; stores in Netlify Blobs "deck-images".
// All logic is in ../../lib/sheet.mjs.
import { getStore } from "@netlify/blobs";
import { makeBackground } from "../../lib/sheet.mjs";

export default makeBackground({ getStore });
