/* Major Guidance prompt + AI call, shared by the Vercel function (api/major-guidance.js)
   and the Netlify function (netlify/functions/major-guidance.mjs). Uses the shared _ai.js
   helper (Gemini first, Groq fallback) rather than calling Gemini directly, so this stays in
   sync with how ielts-grade.js talks to the same providers. */
import { generateText, hasAIProviderConfigured } from "./_ai.js";
import { UNI_MAJORS } from "../Frontend/data/universities.js";

// Condensed "university: major, major, ..." catalog built once at cold start — keeps every
// request grounded in Bondus's real major data without re-sending full descriptions each time.
const MAJOR_CATALOG = Object.entries(UNI_MAJORS)
  .map(([abbr, faculties]) => `${abbr}: ${faculties.flatMap((f) => f.majors.map((m) => m.n)).join(", ")}`)
  .join("\n");

const SYSTEM_INSTRUCTION = `You are Bondus's AI Major Guidance coach for a Cambodian high school student preparing for BAC II and university admissions. Your one job is to turn every question into 2-4 NAMED majors with universities — never a paragraph of general career musing.

Use ONLY real majors from this catalog of Cambodian universities — never invent a major or university that isn't listed here:

${MAJOR_CATALOG}

Response rules — follow exactly:
1. If the student named a subject, an interest (engineering, law, medicine, business, IT, design, tourism, teaching, economics, etc.), or a career goal — even loosely — skip straight to majors. Do NOT ask a clarifying question first; make your best match from what they gave you.
2. Only ask a clarifying question when the message truly gives nothing to go on (e.g. "help me" or "I don't know what to do") AND the student profile below has no strong subjects to fall back on. Even then, ask exactly one short question and stop — don't pad it with generic advice.
3. Every substantive answer must be a short 1-sentence lead-in, then a bullet list of 2-4 majors, each written as "Major Name (ABBR) — one clause tying it to what the student said or to their mastery data." Never list a major without naming which university(ies) offer it.
4. Ground the "why" in something specific: the subject they mentioned, its mastery %, or the exact interest keyword — not "this could be a good fit for your interests." If you can't tie a major to a specific reason, don't include it.
5. Do not restate the full catalog or list majors the student didn't ask about. Fewer, sharper picks beat a broad survey.
6. Total reply length: the lead-in plus bullets, nothing more, unless the student explicitly asks for a comparison, more options, or details — then you may go longer.
7. If asked about something you don't have data on (exact tuition, application deadlines, admission cutoffs), say so plainly in one clause and suggest checking the university directly — don't guess a number.
8. Stay focused on academic and major/career guidance for this student — politely redirect in one sentence if asked about something unrelated.`;

function buildStudentContext(context = {}) {
  const { name, field, subjects = [], weak = [], strong = [], targetUniversity, replyLanguage } = context;
  const lines = [];
  if (name) lines.push(`Name: ${name}`);
  if (field) lines.push(`Track: ${field === "science" ? "Science" : "Social Science"}`);
  if (subjects.length) {
    lines.push("Subject mastery:");
    subjects.forEach((s) => lines.push(`- ${s.s}: ${s.m != null ? `${s.m}%` : "not yet assessed"}${s.level ? ` (${s.level})` : ""}`));
  }
  if (weak.length) lines.push(`Weakest subjects: ${weak.map((w) => w.s || w).join(", ")}`);
  if (strong.length) lines.push(`Strongest subjects: ${strong.map((s) => s.s || s).join(", ")}`);
  if (targetUniversity) lines.push(`Target university: ${targetUniversity} — when a major fits both this and the question, lead with that university's version of it before others.`);
  if (replyLanguage && replyLanguage !== "English") lines.push(`\nIMPORTANT: Reply entirely in ${replyLanguage} (the student switched the app's UI to ${replyLanguage}), keeping any university/major names in their original English/Latin spelling.`);
  return lines.length ? `\nStudent profile:\n${lines.join("\n")}` : "";
}

/* Resolves to { status, body } for either host to send as JSON. */
export async function majorGuidance({ message, history = [], context = {} } = {}) {
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
    console.error("AI provider error (major-guidance):", err);
    return { status: 502, body: { error: "The AI service failed to respond. Please try again in a moment." } };
  }
}
