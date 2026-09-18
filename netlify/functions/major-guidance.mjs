/* Netlify function: POST /api/major-guidance (routed by netlify.toml).
   Shares its prompt and Gemini call with the Vercel function in api/. */
import { majorGuidance } from "../../api/major-guidance-core.js";

export default async (req) => {
  if (req.method !== "POST") {
    return Response.json({ error: "Method not allowed" }, { status: 405 });
  }
  const payload = await req.json().catch(() => ({}));
  const { status, body } = await majorGuidance(payload);
  return Response.json(body, { status });
};
