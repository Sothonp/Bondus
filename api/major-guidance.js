import { GoogleGenAI } from "@google/genai";
import { UNI_MAJORS } from "../src/data/universities.js";

// Condensed "university: major, major, ..." catalog built once at cold start — keeps every
// request grounded in Bondus's real major data without re-sending full descriptions each time.
const MAJOR_CATALOG = Object.entries(UNI_MAJORS)
  .map(([abbr, faculties]) => `${abbr}: ${faculties.flatMap((f) => f.majors.map((m) => m.n)).join(", ")}`)
  .join("\n");

const SYSTEM_INSTRUCTION = `You are Bondus's AI Major Guidance coach for a Cambodian high school student preparing for BAC II and university admissions.

Help the student figure out which university major fits them, using ONLY real majors from this catalog of Cambodian universities — never invent a major or university that isn't listed here:

${MAJOR_CATALOG}

Guidelines:
- Recommend specific majors from the catalog above and name which university offers them, e.g. "Computer Science (RUPP, AUPP)".
- Ground recommendations in the student's actual subject mastery when it's provided below.
- Keep replies warm, conversational, and concise — 3 to 6 sentences unless the student explicitly asks for a list.
- If asked about something you don't have data on (exact tuition, application deadlines), say so plainly and suggest checking the university directly.
- Stay focused on academic and career guidance for this student — politely redirect if asked about unrelated topics.`;

function buildStudentContext(context = {}) {
  const { name, field, subjects = [], weak = [], strong = [] } = context;
  const lines = [];
  if (name) lines.push(`Name: ${name}`);
  if (field) lines.push(`Track: ${field === "science" ? "Science" : "Social Science"}`);
  if (subjects.length) {
    lines.push("Subject mastery:");
    subjects.forEach((s) => lines.push(`- ${s.s}: ${s.m != null ? `${s.m}%` : "not yet assessed"}${s.level ? ` (${s.level})` : ""}`));
  }
  if (weak.length) lines.push(`Weakest subjects: ${weak.map((w) => w.s || w).join(", ")}`);
  if (strong.length) lines.push(`Strongest subjects: ${strong.map((s) => s.s || s).join(", ")}`);
  return lines.length ? `\nStudent profile:\n${lines.join("\n")}` : "";
}

export default async function handler(req, res) {
  if (req.method !== "POST") {
    res.status(405).json({ error: "Method not allowed" });
    return;
  }

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    res.status(500).json({ error: "Server is missing GEMINI_API_KEY. Add it in your Vercel project's Environment Variables." });
    return;
  }

  const { message, history = [], context = {} } = req.body || {};
  if (!message || typeof message !== "string" || !message.trim()) {
    res.status(400).json({ error: "Missing 'message' in request body." });
    return;
  }

  const ai = new GoogleGenAI({ apiKey });
  const contents = [
    ...history.slice(-12).map((m) => ({ role: m.role === "user" ? "user" : "model", parts: [{ text: m.text }] })),
    { role: "user", parts: [{ text: message }] },
  ];

  try {
    const response = await ai.models.generateContent({
      model: "gemini-flash-latest",
      contents,
      config: {
        systemInstruction: SYSTEM_INSTRUCTION + buildStudentContext(context),
        maxOutputTokens: 700,
        temperature: 0.7,
        // This is a quick advisory chat, not a task needing multi-step reasoning — thinking
        // tokens were silently eating the entire output budget, truncating every reply.
        thinkingConfig: { thinkingBudget: 0 },
      },
    });
    const text = response.text ?? "";
    if (!text) {
      res.status(502).json({ error: "The AI service returned an empty response. Please try again." });
      return;
    }
    res.status(200).json({ text });
  } catch (err) {
    console.error("Gemini API error:", err);
    res.status(502).json({ error: "The AI service failed to respond. Please try again in a moment." });
  }
}
