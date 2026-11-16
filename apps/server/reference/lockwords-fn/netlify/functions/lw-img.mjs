// Lockwords funnel v3: status and image of a picture sheet made by lw-img-background.
//   GET /api/img?id=…        → {status: "pending" | "ready" | "error", url?, error?}   (503 {error:"no_key"} without OPENAI_API_KEY)
//   GET /api/img?id=…&img=1  → the sheet image (webp or png), cached for a year
import { getStore } from "@netlify/blobs";
import { makeStatus } from "../../lib/sheet.mjs";

export default makeStatus({ getStore });
export const config = { path: "/api/img" };
