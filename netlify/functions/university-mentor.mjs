/* Netlify function: POST /api/university-mentor (routed by netlify.toml).
   Shares its prompt and AI call with the Vercel function in api/. */
import { universityMentor } from "../../api/university-mentor-core.js";

export default async (req) => {
  if (req.method !== "POST") {
    return Response.json({ error: "Method not allowed" }, { status: 405 });
  }
  const payload = await req.json().catch(() => ({}));
  const { status, body } = await universityMentor(payload);
  return Response.json(body, { status });
};
