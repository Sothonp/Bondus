import { GoogleGenAI } from "@google/genai";

// Fast, cheap Groq-hosted model — used only when Gemini is unavailable or fails.
const GROQ_MODEL = process.env.GROQ_MODEL || "llama-3.3-70b-versatile";

// Gemini models, tried in order until one answers. The same names (and env settings) the AI coach server uses.
// "gemini-flash-latest" goes last: it is an alias for whichever flash model is newest, which is often overloaded
// (503) or spends the whole output budget thinking and returns nothing.
function geminiModels() {
  const list = [
    process.env.GEMINI_MODEL || "gemini-3.6-flash",
    ...(process.env.GEMINI_FALLBACK_MODELS || "gemini-3.8-flash,gemini-3.5-flash,gemini-flash-latest").split(","),
  ].map((m) => m.trim()).filter(Boolean);
  return [...new Set(list)];
}

// A model that hangs must not eat the whole function time limit: after this long, move on to the next one.
const GEMINI_TIMEOUT_MS = 12000;

async function callGemini({ apiKey, model, systemInstruction, contents, maxOutputTokens, temperature, jsonMode }) {
  const ai = new GoogleGenAI({ apiKey, httpOptions: { timeout: GEMINI_TIMEOUT_MS } });
  const result = await ai.models.generateContent({
    model,
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
    for (const model of geminiModels()) {
      try {
        return await callGemini({ apiKey: geminiKey, model, systemInstruction, contents, maxOutputTokens, temperature, jsonMode });
      } catch (err) {
        console.error(`Gemini API error (${model})${groqKey ? ", trying the next model, then Groq:" : ", trying the next model:"}`, err);
        lastErr = err;
      }
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
