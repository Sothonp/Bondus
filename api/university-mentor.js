/* Vercel serverless function: POST /api/university-mentor. The Netlify equivalent lives in
   netlify/functions/university-mentor.mjs; both call the same universityMentor(). */
import { universityMentor } from "./university-mentor-core.js";

export default async function handler(req, res) {
  if (req.method !== "POST") {
    res.status(405).json({ error: "Method not allowed" });
    return;
  }
  const { status, body } = await universityMentor(req.body || {});
  res.status(status).json(body);
}
