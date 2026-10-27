/* Client for the Bondus backend (Laravel, /api/v1) — the contract is docs/API.md in the bondus-backend project.

   createApi({ baseUrl }) returns the whole client. With no baseUrl the client is "disabled" (api.enabled === false) and the
   app keeps working exactly as the old browser-only prototype; App.jsx passes import.meta.env.VITE_API_URL here, e.g.
   "http://localhost:8001/api/v1" in development or "https://<api-host>/api/v1" in production.

   Every failed call throws an ApiError with a stable `code`: the backend's own codes (invalid_credentials, phone_taken,
   email_taken, validation_failed, stale_state, too_many_requests, ...) plus three made here:
     network_error — the server could not be reached (status 0)
     bad_response  — the answer was not JSON (a wrong URL, or a static host's index.html)
     server_error  — a non-JSON-coded failure such as a 500
   The app turns codes into English/Khmer text, so nothing here is user-facing. The login token is kept in localStorage
   (best effort: if storage is blocked the session just lasts until the tab closes). */

export class ApiError extends Error {
  constructor(status, code, message, { errors = null, body = null, retryAfter = null } = {}) {
    super(message);
    this.name = "ApiError";
    this.status = status;   // HTTP status; 0 when the server could not be reached
    this.code = code;
    this.errors = errors;   // validation errors, { field: [messages] }
    this.body = body;       // the parsed error body, e.g. { code: "stale_state", revision: 4 }
    this.retryAfter = retryAfter; // whole seconds to wait before trying again (429), or null when the server did not say
  }
}

const TOKEN_KEY = "bondus_token";

function browserStorage() {
  try { return globalThis.localStorage ?? null; } catch { return null; }
}

/* "How long to wait" as whole seconds, or null: a number (or numeric string) of seconds, or an HTTP date, which is the
   other form the Retry-After header may take. */
function waitSeconds(value) {
  if (value === null || value === undefined || value === "") return null;
  const n = Number(value);
  if (Number.isFinite(n)) return n > 0 ? Math.ceil(n) : null;
  if (typeof value === "string") {
    const at = Date.parse(value);
    if (Number.isFinite(at)) { const s = Math.ceil((at - Date.now()) / 1000); return s > 0 ? s : null; }
  }
  return null;
}

export function createApi({ baseUrl = "", fetchImpl, storage = browserStorage() } = {}) {
  const base = String(baseUrl || "").trim().replace(/\/+$/, "");
  const doFetch = fetchImpl ?? ((...args) => globalThis.fetch(...args));
  let unauthorizedHandler = () => {};
  let memoryToken = null; // used when storage is unavailable

  const readToken = () => {
    try { return storage?.getItem(TOKEN_KEY) || memoryToken; } catch { return memoryToken; }
  };
  const setToken = (token) => {
    memoryToken = token || null;
    try { token ? storage?.setItem(TOKEN_KEY, token) : storage?.removeItem(TOKEN_KEY); } catch { /* storage blocked: keep the in-memory copy */ }
  };

  async function request(method, path, { body, auth = true } = {}) {
    if (!base) throw new ApiError(0, "api_disabled", "The server address is not configured");
    const headers = { Accept: "application/json" };
    // A FormData body (photo upload) sets its own multipart Content-Type with a browser-generated
    // boundary and must never be JSON-stringified — everything else keeps the usual JSON contract.
    const isForm = typeof FormData !== "undefined" && body instanceof FormData;
    if (body !== undefined && !isForm) headers["Content-Type"] = "application/json";
    const token = auth ? readToken() : null;
    if (token) headers.Authorization = `Bearer ${token}`;

    let res;
    try {
      const payload = body === undefined ? undefined : isForm ? body : JSON.stringify(body);
      res = await doFetch(base + path, { method, headers, body: payload });
    } catch {
      throw new ApiError(0, "network_error", "Could not reach the server");
    }

    const text = await res.text().catch(() => "");
    let data = null;
    if (text) {
      try { data = JSON.parse(text); } catch {
        // A rate limit answered by something in front of the API (a proxy or CDN) is not JSON, but it is still a rate limit.
        if (res.status === 429) throw new ApiError(429, "too_many_requests", "Too many requests", { retryAfter: waitSeconds(res.headers?.get?.("Retry-After")) });
        throw new ApiError(res.status, "bad_response", "The server sent something unexpected");
      }
    } else if (res.ok && res.status !== 204) {
      throw new ApiError(res.status, "bad_response", "The server sent an empty answer");
    }

    if (!res.ok) {
      const code = data?.code ?? (res.status === 401 ? "unauthenticated" : res.status === 429 ? "too_many_requests" : "server_error");
      if (res.status === 401 && auth && code === "unauthenticated") { setToken(null); unauthorizedHandler(); }
      // How long to wait: the backend puts it in the JSON body (a browser can only read the Retry-After header when the
      // server exposes it to cross-origin pages), so look in both.
      const retryAfter = waitSeconds(data?.retryAfter) ?? waitSeconds(res.headers?.get?.("Retry-After"));
      throw new ApiError(res.status, code, data?.message ?? "Request failed", { errors: data?.errors ?? null, body: data, retryAfter });
    }
    return data;
  }

  const get = (path, opts) => request("GET", path, opts);
  const send = (method, path, body, opts) => request(method, path, { ...opts, body });

  // Sign-in calls remember the token before returning, so the next call is already authenticated.
  const remember = (res) => { if (res?.token) setToken(res.token); return res; };

  return {
    enabled: Boolean(base),
    baseUrl: base,
    hasToken: () => Boolean(readToken()),
    clearToken: () => setToken(null),
    // Adds the sign-in token to a request for another server of ours (the AI coach), which asks this API whether the
    // token is valid. Signed out, the request comes back untouched.
    authorize: (init = {}) => {
      const token = readToken();
      return token ? { ...init, headers: { ...init.headers, Authorization: `Bearer ${token}` } } : init;
    },
    onUnauthorized: (fn) => { unauthorizedHandler = typeof fn === "function" ? fn : () => {}; },

    // accounts
    register: (payload) => send("POST", "/register", payload, { auth: false }).then(remember),
    login: ({ login, password }) => send("POST", "/login", { login, password }, { auth: false }).then(remember),
    // The credential is the ID token Google's own button hands back client-side -- the backend
    // verifies it, so this needs no password either way.
    loginWithGoogle: (credential) => send("POST", "/auth/google", { credential }, { auth: false }).then(remember),
    logout: async () => { try { await send("POST", "/logout"); } catch { /* the session is going away either way */ } setToken(null); },
    getMe: () => get("/me"),
    patchMe: (fields) => send("PATCH", "/me", fields),
    forgotPassword: ({ login }) => send("POST", "/forgot-password", { login }, { auth: false }),
    resetPassword: ({ login, code, password }) => send("POST", "/reset-password", { login, code, password }, { auth: false }).then(remember),

    // progress
    getState: () => get("/me/state"),
    putState: (state, baseRevision) => send("PUT", "/me/state", { state, baseRevision }),
    getSummary: () => get("/me/summary"),
    postStudyEvent: (event) => send("POST", "/study-events", event),

    // the student's own daily plan
    getPlan: (date) => get(`/plan${date ? `?date=${encodeURIComponent(date)}` : ""}`),
    addPlanTask: (task) => send("POST", "/plan/tasks", task),
    patchPlanTask: (id, fields) => send("PATCH", `/plan/tasks/${id}`, fields),
    deletePlanTask: (id) => send("DELETE", `/plan/tasks/${id}`),

    // exam papers (public)
    getExams: (query = {}) => {
      const qs = new URLSearchParams(Object.entries(query).filter(([, v]) => v !== undefined && v !== "")).toString();
      return get(`/exams${qs ? `?${qs}` : ""}`, { auth: false });
    },

    // exercises an admin posted: open to any signed-in student, browsed by subject (e.g. "physics").
    getExercises: (subject) => get(`/exercises${subject ? `?subject=${encodeURIComponent(subject)}` : ""}`),
    getExercise: (id) => get(`/exercises/${id}`),

    // exercises: admin-only -- post a sheet for a subject (with the teacher and school it came from), then its files.
    getAdminExercises: (subject) => get(`/admin/exercises${subject ? `?subject=${encodeURIComponent(subject)}` : ""}`),
    createAdminExercise: (fields) => send("POST", "/admin/exercises", fields),
    updateAdminExercise: (id, fields) => send("PATCH", `/admin/exercises/${id}`, fields),
    deleteAdminExercise: (id) => send("DELETE", `/admin/exercises/${id}`),
    addExerciseAttachment: (exerciseId, file) => {
      const form = new FormData();
      form.append("file", file);
      return send("POST", `/admin/exercises/${exerciseId}/attachments`, form);
    },
    removeExerciseAttachment: (exerciseId, attachmentId) => send("DELETE", `/admin/exercises/${exerciseId}/attachments/${attachmentId}`),
  };
}
