/* University Mentor prompt + AI call, shared by the Vercel function (api/university-mentor.js)
   and the Netlify function (netlify/functions/university-mentor.mjs). Uses the shared _ai.js
   helper (Gemini first, Groq fallback), same pattern as major-guidance-core.js — the two are
   separate prompts because a university student's context (major/year/goals, not a BAC II
   track/mastery %) is a different shape entirely. */
import { generateText, hasAIProviderConfigured } from "./_ai.js";

const SYSTEM_INSTRUCTION = `You are Bondus's AI University Mentor for a student who is already at university, or preparing to enter one — never a Grade 11/12 BAC II student (a separate Study Help / Major Guidance mode handles those). Your job is to help with university coursework, career preparation, scholarships, and study-abroad questions, grounded in the student's own major, year and goals.

Response rules — follow exactly:
1. Answer the actual question directly and concretely — a short lead-in, then specific, actionable content (steps, a short explanation, named resources/skills). Avoid generic "it depends" filler.
2. Ground advice in the student's major and year when it's given below — a 1st-year Computer Science student and a graduating Law student need different answers to "how do I prepare for a career."
3. If asked something you don't have real data on (a specific scholarship's deadline, a specific university's exact tuition), say so plainly in one clause rather than inventing a number.
4. Keep replies focused and skimmable — a short paragraph or a few bullets, not an essay — unless the student explicitly asks for more depth or a comparison.
5. Stay focused on university/career/scholarship/study-abroad guidance for this student — politely redirect in one sentence if asked about something unrelated.`;

function buildStudentContext(context = {}) {
  const { name, major, year, goals = [], replyLanguage } = context;
  const lines = [];
  if (name) lines.push(`Name: ${name}`);
  if (major) lines.push(`Field of study: ${major}`);
  if (year) lines.push(`Stage: ${year}`);
  if (goals.length) lines.push(`Goals: ${goals.join(", ")}`);
  if (replyLanguage && replyLanguage !== "English") lines.push(`\nIMPORTANT: Reply entirely in ${replyLanguage} (the student switched the app's UI to ${replyLanguage}), keeping any technical/course terminology in its original English spelling.`);
  return lines.length ? `\nStudent profile:\n${lines.join("\n")}` : "";
}

/* Resolves to { status, body } for either host to send as JSON. */
export async function universityMentor({ message, history = [], context = {} } = {}) {
  if (!hasAIProviderConfigured()) {
    return { status: 500, body: { error: "Server is missing GEMINI_API_KEY or GROQ_API_KEY. Add at least one in your host's environment variables." } };
  }
  if (!message || typeof message !== "string" || !message.trim()) {
    return { status: 400, body: { error: "Missing 'message' in request body." } };
  }

  const contents = [
    ...history.slice(-12).map((m) => ({ role: m.role === "user" ? "user" : "model", parts: [{ text: m.text }] })),
    { role: "user", parts: [{ text: message }] },
  ];

  try {
    const text = await generateText({
      systemInstruction: SYSTEM_INSTRUCTION + buildStudentContext(context),
      contents,
      maxOutputTokens: 700,
      temperature: 0.4,
    });
    return { status: 200, body: { text } };
  } catch (err) {
    console.error("AI provider error (university-mentor):", err);
    return { status: 502, body: { error: "The AI service failed to respond. Please try again in a moment." } };
  }
}
