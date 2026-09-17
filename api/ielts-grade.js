import { generateText, hasAIProviderConfigured } from "./_ai.js";

const SYSTEM_INSTRUCTION = `You are an experienced, certified IELTS examiner grading a single response from a short placement diagnostic (not a full mock exam).

You will be given the skill being tested (writing or speaking), the task prompt, and the student's response. Grade strictly but fairly against the real IELTS band descriptors (Task Achievement/Coherence for writing, Fluency/Coherence/Lexical Resource/Grammar for speaking, evaluated here from the written transcript of what the student said).

Respond with ONLY a JSON object, no markdown fences, no extra text, in exactly this shape:
{"band": <number from 1 to 9, in 0.5 steps>, "feedback": "<2-3 sentences of specific, encouraging feedback citing something concrete from their response>"}`;

export default async function handler(req, res) {
  if (req.method !== "POST") {
    res.status(405).json({ error: "Method not allowed" });
    return;
  }

  if (!hasAIProviderConfigured()) {
    res.status(500).json({ error: "Server is missing GEMINI_API_KEY or GROQ_API_KEY. Add at least one in your Vercel project's Environment Variables." });
    return;
  }

  const { skill, prompt, response } = req.body || {};
  if (!skill || !["writing", "speaking"].includes(skill)) {
    res.status(400).json({ error: "Missing or invalid 'skill' — expected 'writing' or 'speaking'." });
    return;
  }
  if (!prompt || typeof prompt !== "string") {
    res.status(400).json({ error: "Missing 'prompt' in request body." });
    return;
  }
  if (!response || typeof response !== "string" || !response.trim()) {
    res.status(400).json({ error: "Missing 'response' in request body." });
    return;
  }

  const userMessage = `Skill: ${skill}\n\nTask prompt:\n${prompt}\n\nStudent's response:\n${response}`;

  try {
    const text = await generateText({
      systemInstruction: SYSTEM_INSTRUCTION,
      contents: [{ role: "user", parts: [{ text: userMessage }] }],
      maxOutputTokens: 300,
      temperature: 0.3,
      jsonMode: true,
    });

    let parsed;
    try {
      parsed = JSON.parse(text);
    } catch {
      res.status(502).json({ error: "The AI service returned an unexpected format." });
      return;
    }

    const band = Number(parsed.band);
    if (!Number.isFinite(band) || band < 1 || band > 9) {
      res.status(502).json({ error: "The AI service returned an invalid band score." });
      return;
    }

    res.status(200).json({ band: Math.round(band * 2) / 2, feedback: typeof parsed.feedback === "string" ? parsed.feedback : "" });
  } catch (err) {
    console.error("AI provider error (ielts-grade):", err);
    res.status(502).json({ error: "The AI service failed to respond. Please try again in a moment." });
  }
}
