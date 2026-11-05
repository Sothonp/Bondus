/* How much a caller may send to an AI function. A signed-in student could otherwise send a message, a history or a profile of any
   size (up to the host's own body limit, megabytes) and have it all sent to the model: tokens spent, and a model quota that is
   shared by every student. The limits are generous for a real chat (the AI coach server takes 4000 characters too) and tested in
   aiLimits.test.js. */
export const MAX_MESSAGE_CHARS = 4000;
export const MAX_HISTORY_TURNS = 12;
export const MAX_CONTEXT_CHARS = 6000;

const tooLong = (what, max) => ({
  status: 413,
  body: { error: `Your ${what} is too long. Please keep it under ${max.toLocaleString("en-US")} characters.`, code: "too_long" },
});

/* Resolves to { error } (a { status, body } to answer with) or { message, history, context }, all safe to put in a prompt:
   the history only has text turns, at most 12, each cut to the message limit; a context that is too big, or not an object, is
   dropped rather than refused (it is the app's own profile, not something the student typed). */
export function cleanChat({ message, history, context } = {}) {
  if (!message || typeof message !== "string" || !message.trim()) {
    return { error: { status: 400, body: { error: "Missing 'message' in request body." } } };
  }
  if (message.length > MAX_MESSAGE_CHARS) return { error: tooLong("message", MAX_MESSAGE_CHARS) };

  const turns = (Array.isArray(history) ? history : [])
    .filter((m) => m && typeof m === "object" && typeof m.text === "string" && m.text.trim())
    .slice(-MAX_HISTORY_TURNS)
    .map((m) => ({ role: m.role === "user" ? "user" : "model", text: m.text.slice(0, MAX_MESSAGE_CHARS) }));

  let safeContext = {};
  if (context && typeof context === "object" && !Array.isArray(context)) {
    try {
      if (JSON.stringify(context).length <= MAX_CONTEXT_CHARS) safeContext = context;
    } catch { /* not serialisable: dropped */ }
  }
  return { message, history: turns, context: safeContext };
}

/* For a function that takes a few named text fields: the first one over its limit, as { status, body }, else null. */
export function tooLongField(fields, limits) {
  for (const [name, max] of Object.entries(limits)) {
    if (typeof fields[name] === "string" && fields[name].length > max) return tooLong(name, max);
  }
  return null;
}
