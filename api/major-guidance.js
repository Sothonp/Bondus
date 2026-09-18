/* Vercel serverless function: POST /api/major-guidance. The Netlify equivalent lives in
   netlify/functions/major-guidance.mjs; both call the same majorGuidance(). */
import { majorGuidance } from "./major-guidance-core.js";

export default async function handler(req, res) {
  if (req.method !== "POST") {
    res.status(405).json({ error: "Method not allowed" });
    return;
  }
  const { status, body } = await majorGuidance(req.body || {});
  res.status(status).json(body);
}
