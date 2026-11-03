/* The daily limit on AI questions (rules only: no React, no network of its own; tested in aiQuota.test.js).

   Free gets 5 a day, VIP Bondus 60, Super Bondus 150, and the backend does the counting (docs/API.md, "Plans and AI
   questions"). Before each question the app asks the backend to count it under an id made for that question, and sends the
   same id to the AI server, which reports it too; the backend counts one id once, so nothing is counted twice.

   The app's check keeps honest students informed and stops them early. The limit is only real where the AI server enforces
   it, because anyone can call that server directly. */
import { newAttemptId } from "./serverMapping.js";

export const AI_LIMIT_CODE = "ai_limit_reached";
export const UPLOAD_LIMIT_CODE = "upload_limit_reached";

/* Photos and PDFs the AI coach takes in a day, by plan: Free none, VIP Bondus 10, Super Bondus 40 (the backend's
   bondus.plans.upload_daily). Used only when the backend has not said (an older one), so the screen still matches the plan. */
export const UPLOADS_BY_PLAN = { free: 0, standard: 10, premium: 40 };

/* One id per question the student asks (not per continuation round): the backend accepts 8 to 64 letters, digits, - and _. */
export const newAiRequestId = () => newAttemptId();

/* A usage object from the backend (GET /ai/usage, a /ai/consume answer, or the body of its 402), or null if it is not one. */
export function readUsage(body) {
  if (!body || typeof body !== "object") return null;
  const { plan, limit, used, remaining, resetsAt } = body;
  if (typeof plan !== "string" || !Number.isFinite(limit) || !Number.isFinite(used)) return null;
  const uploadLimit = Number.isFinite(body.uploadLimit) ? body.uploadLimit : (UPLOADS_BY_PLAN[plan] ?? 0);
  const uploadsUsed = Number.isFinite(body.uploadsUsed) ? body.uploadsUsed : 0;
  const uploadsRemaining = Number.isFinite(body.uploadsRemaining) ? body.uploadsRemaining : Math.max(0, uploadLimit - uploadsUsed);
  return {
    plan, limit, used, remaining: Number.isFinite(remaining) ? remaining : Math.max(0, limit - used), resetsAt: resetsAt ?? null,
    uploadLimit, uploadsUsed, uploadsRemaining,
  };
}

/* Count one question before asking it. Never throws.
     { ok: true,  usage }  go ahead (usage is null when nothing was checked: signed out, no backend, or the backend was unreachable)
     { ok: false, usage, reason }  the student cannot ask: reason is "questions" (out of questions for today) or "uploads"
                                   (the photos do not fit in the plan's uploads: Free has none, or today's are used up)

   Only a clear "no" from the backend (402) stops a question. If the backend cannot be reached or errors, the question goes
   ahead: our own outage should not shut students out of studying, and the AI server still enforces the limit itself. */
export async function askAllowance(api, requestId, uploads = 0) {
  if (!api?.enabled || !api.hasToken?.()) return { ok: true, usage: null };
  try {
    return { ok: true, usage: readUsage(await api.consumeAi(requestId, uploads)) };
  } catch (err) {
    if (err?.status === 402 && err?.code === AI_LIMIT_CODE) return { ok: false, usage: readUsage(err.body), reason: "questions" };
    if (err?.status === 402 && err?.code === UPLOAD_LIMIT_CODE) return { ok: false, usage: readUsage(err.body), reason: "uploads" };
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

/* Photos and PDFs. null while the plan lets `n` more through (or nothing is known: the backend decides), else why not:
     "plan"   the plan has no uploads at all (Free), so the way forward is an upgrade
     "daily"  today's uploads are used up (they come back at Phnom Penh midnight) */
export function uploadRefusal(usage, n = 1) {
  if (!usage) return null;
  if (usage.uploadLimit <= 0) return "plan";
  return usage.uploadsRemaining < n ? "daily" : null;
}
export const uploadsLeft = (usage) => (usage && usage.uploadLimit > 0 ? { n: Math.max(0, usage.uploadsRemaining), limit: usage.uploadLimit } : null);
