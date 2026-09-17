import { GoogleGenAI } from "@google/genai";

// Fast, cheap Groq-hosted model — used only when Gemini is unavailable or fails.
const GROQ_MODEL = "llama-3.3-70b-versatile";

async function callGemini({ apiKey, systemInstruction, contents, maxOutputTokens, temperature, jsonMode }) {
  const ai = new GoogleGenAI({ apiKey });
  const result = await ai.models.generateContent({
    model: "gemini-flash-latest",
    contents,
    config: {
      systemInstruction,
      maxOutputTokens,
      temperature,
      ...(jsonMode ? { responseMimeType: "application/json" } : {}),
      thinkingConfig: { thinkingBudget: 0 },
    },
  });
  const text = result.text ?? "";
  if (!text) throw new Error("Gemini returned an empty response");
  return text;
}

function contentsToMessages(contents) {
  return contents.map((c) => ({
    role: c.role === "model" ? "assistant" : "user",
    content: c.parts.map((p) => p.text).join("\n"),
  }));
}

async function callGroq({ apiKey, systemInstruction, contents, maxOutputTokens, temperature, jsonMode }) {
  const res = await fetch("https://api.groq.com/openai/v1/chat/completions", {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
    body: JSON.stringify({
      model: GROQ_MODEL,
      messages: [{ role: "system", content: systemInstruction }, ...contentsToMessages(contents)],
      max_tokens: maxOutputTokens,
      temperature,
      ...(jsonMode ? { response_format: { type: "json_object" } } : {}),
    }),
  });
  if (!res.ok) {
    throw new Error(`Groq API error ${res.status}: ${await res.text().catch(() => "")}`);
  }
  const data = await res.json();
  const text = data.choices?.[0]?.message?.content ?? "";
  if (!text) throw new Error("Groq returned an empty response");
  return text;
}

// Tries Gemini first, then falls back to Groq if Gemini is unavailable, rate-limited, or errors.
export async function generateText({ systemInstruction, contents, maxOutputTokens, temperature, jsonMode = false }) {
  const geminiKey = process.env.GEMINI_API_KEY;
  const groqKey = process.env.GROQ_API_KEY;

  let lastErr;
  if (geminiKey) {
    try {
      return await callGemini({ apiKey: geminiKey, systemInstruction, contents, maxOutputTokens, temperature, jsonMode });
    } catch (err) {
      console.error("Gemini API error" + (groqKey ? ", falling back to Groq:" : ":"), err);
      lastErr = err;
    }
  }
  if (groqKey) {
    try {
      return await callGroq({ apiKey: groqKey, systemInstruction, contents, maxOutputTokens, temperature, jsonMode });
    } catch (err) {
      console.error("Groq API error:", err);
      lastErr = err;
    }
  }
  throw lastErr ?? new Error("No AI provider configured");
}

export function hasAIProviderConfigured() {
  return Boolean(process.env.GEMINI_API_KEY || process.env.GROQ_API_KEY);
}
