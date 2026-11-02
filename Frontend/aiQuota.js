/* The daily limit on AI questions (rules only: no React, no network of its own; tested in aiQuota.test.js).

   Free gets 5 a day, VIP Bondus 60, Super Bondus 150, and the backend does the counting (docs/API.md, "Plans and AI
   questions"). Before each question the app asks the backend to count it under an id made for that question, and sends the
   same id to the AI server, which reports it too; the backend counts one id once, so nothing is counted twice.

   The app's check keeps honest students informed and stops them early. The limit is only real where the AI server enforces
   it, because anyone can call that server directly. */
import { newAttemptId } from "./serverMapping.js";

export const AI_LIMIT_CODE = "ai_limit_reached";

/* One id per question the student asks (not per continuation round): the backend accepts 8 to 64 letters, digits, - and _. */
export const newAiRequestId = () => newAttemptId();

/* A usage object from the backend (GET /ai/usage, a /ai/consume answer, or the body of its 402), or null if it is not one. */
export function readUsage(body) {
  if (!body || typeof body !== "object") return null;
  const { plan, limit, used, remaining, resetsAt } = body;
  if (typeof plan !== "string" || !Number.isFinite(limit) || !Number.isFinite(used)) return null;
  return { plan, limit, used, remaining: Number.isFinite(remaining) ? remaining : Math.max(0, limit - used), resetsAt: resetsAt ?? null };
}

/* Count one question before asking it. Never throws.
     { ok: true,  usage }  go ahead (usage is null when nothing was checked: signed out, no backend, or the backend was unreachable)
     { ok: false, usage }  the student is out of questions for today

   Only a clear "no" from the backend (402) stops a question. If the backend cannot be reached or errors, the question goes
   ahead: our own outage should not shut students out of studying, and the AI server still enforces the limit itself. */
export async function askAllowance(api, requestId) {
  if (!api?.enabled || !api.hasToken?.()) return { ok: true, usage: null };
  try {
    return { ok: true, usage: readUsage(await api.consumeAi(requestId)) };
  } catch (err) {
    if (err?.status === 402 && err?.code === AI_LIMIT_CODE) return { ok: false, usage: readUsage(err.body) };
    return { ok: true, usage: null };
  }
}

/* Whether the pricing page should offer an upgrade to this plan id: Free can go to either paid plan, VIP to Super. */
const ORDER = { free: 0, standard: 1, premium: 2 };
export const planRank = (id) => ORDER[id] ?? 0;
export const canUpgradeTo = (current, target) => planRank(target) > planRank(current);

/* "3 of 5": how many questions are left, as numbers the screen formats (Khmer digits are the screen's business). */
export const leftOf = (usage) => (usage ? { n: Math.max(0, usage.remaining), limit: usage.limit } : null);
export const isOut = (usage) => Boolean(usage) && usage.remaining <= 0;
