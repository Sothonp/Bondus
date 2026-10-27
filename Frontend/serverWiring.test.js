/* Guards on how Frontend/App.jsx is wired to the backend. App.jsx is read as text because the app has no DOM test
   harness; these pin the lines that, if lost, would silently break sign-in, saving or XP.
   Run with:  node --test Frontend/serverWiring.test.js */
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const app = readFileSync(new URL("./App.jsx", import.meta.url), "utf8");
const between = (from, to) => { const a = app.indexOf(from); assert.ok(a >= 0, `missing: ${from}`); return app.slice(a, app.indexOf(to, a)); };

test("the server is used only when VITE_API_URL is set; otherwise the browser-only prototype runs unchanged", () => {
  assert.match(app, /createApi\(\{ baseUrl: import\.meta\.env\.VITE_API_URL \}\)/);
  assert.match(app, /const SERVER_MODE = api\.enabled;/);
  assert.match(app, /if \(SERVER_MODE \|\| !profile\) return;/); // the localStorage save is skipped with a server
});

test("signing in, signing out and creating the account all talk to the server", () => {
  const auth = between("const resetSession = ", '// "Back" from the step-4');
  assert.match(auth, /api\.login\(\{ login:/);
  assert.match(auth, /api\.logout\(\)/);
  assert.match(auth, /api\.register\(registrationToPayload\(reg\)\)/);
  assert.match(auth, /api\.patchMe\(registrationToPatch\(reg\)\)/); // going Back and editing must not register twice
  assert.match(auth, /error: err\?\.code/);
});

test("a wrong sign-up or login shows a message, not a crash, and says how long to wait when rate limited", () => {
  assert.match(app, /res && res\.error \? apiErrorText\(lang, res\.error, res\.retryAfter\)/);   // Login
  assert.match(app, /if \(res && res\.error\) \{ setSubmitError\(apiErrorText\(lang, res\.error, res\.retryAfter\)\); if \(res\.step\) setStep\(res\.step\); \}/); // Register
  // the five places that turn a failed server call into a result for a screen all pass the wait time along
  // (sign in, sign up, Google sign-in, signing in after a password reset, and entering the dashboard without an assessment)
  assert.equal((app.match(/retryAfter: err\?\.retryAfter \?\? null/g) || []).length, 5);
});

test("Google sign-in is wired on both Login and Register, and a brand-new account resumes onboarding at step 2", () => {
  assert.match(app, /const GOOGLE_CLIENT_ID = import\.meta\.env\.VITE_GOOGLE_CLIENT_ID;/);
  assert.match(app, /function GoogleSignInButton\(/);

  const handler = between("const handleGoogleAuth = async", "// After \"Forgot password\"");
  assert.match(handler, /api\.loginWithGoogle\(credential\)/);
  assert.match(handler, /serverUserRef\.current = res\.user;/);
  // No track yet (a brand-new account, or one that never finished onboarding) -- resume at step 2,
  // never straight into the dashboard with half a profile.
  assert.match(handler, /if \(!res\.user\.field && res\.user\.educationLevel !== "university"\) \{/);
  assert.match(handler, /step: 2, _key: Date\.now\(\)/);
  assert.match(handler, /await loadAccount\(\);/);

  const login = between("function Login(", "function SendingCard(");
  assert.match(login, /<GoogleSignInButton onCredential=\{handleGoogle\} lang=\{lang\} text="signin_with" \/>/);
  const register = between("function Register(", "function Dashboard(");
  assert.match(register, /<GoogleSignInButton onCredential=\{handleGoogle\} lang=\{lang\} text="signup_with" \/>/);

  assert.match(app, /<Register key=\{resumeReg\?\._key \?\? "register"\}/);
});

test("'too many tries' names the real wait (e.g. 48 minutes) instead of always saying 'a minute'", () => {
  assert.match(app, /code === "too_many_requests" && waitParts\(retryAfter\)/);
  assert.match(app, /t\(lang, "errTooManyWait"\)\.replace\("\{time\}", formatWait\(lang, retryAfter\)\)/);
});

test("on the 'send code' screen a code that is already on its way goes to the code screen, but a rate limit shows the wait", () => {
  const send = app.slice(app.indexOf("const sendCode = async"), app.indexOf("const resetPassword = async"));
  assert.match(send, /isCodeAlreadySent\(err\) && err\.retryAfter > 0\) \{/);
  assert.match(send, /setMaskedEmail\(masked\); setStep\(2\); setCooldown\(err\.retryAfter\);/);
  assert.match(send, /setError\(apiErrorText\(lang, err\?\.code, err\?\.retryAfter\)\)/);
});

test("Back then 'Send code' again inside the resend wait goes to the code screen without asking the server (it would only burn one of the 5 hourly tries)", () => {
  const send = app.slice(app.indexOf("const sendCode = async"), app.indexOf("const resetPassword = async"));
  assert.match(app, /const recentCodes = new Map\(\);/);
  // the check comes BEFORE the request
  assert.ok(send.indexOf("recentCodes.get(who)") < send.indexOf("api.forgotPassword("), "the recent-code check must run before the request");
  assert.match(send, /if \(recent && recent\.until > Date\.now\(\)\) \{/);
  assert.match(send, /recentCodes\.set\(who, \{ until: Date\.now\(\) \+ 60000, masked: res\?\.maskedEmail \?\? "" \}\);/);
});

test("the code screen never shows 'sent a code to …' with no address, and its countdown uses the page's digits", () => {
  assert.match(app, /\{email \? <>\{t\(lang, "forgotCodeSent"\)\} <strong[^>]*>\{email\}<\/strong><\/> : t\(lang, "forgotCodeSentGeneric"\)\}/);
  assert.match(app, /` \(\$\{localizeNum\(cooldown, lang\)\}\)`/);
});

test("a busy (429) or slow (408) server while restoring a saved login keeps the login and shows the retry screen with the wait", () => {
  const boot = app.slice(app.indexOf("const bootAccount = () =>"), app.indexOf("useEffect(() => {", app.indexOf("const bootAccount = () =>")));
  assert.match(boot, /err\?\.status === 0 \|\| err\?\.status === 408 \|\| err\?\.status === 429 \|\| err\?\.status >= 500\) setBootError\(err\)/);
  assert.match(boot, /else api\.clearToken\(\)/);
  assert.match(app, /title=\{bootError\.status === 429 \? apiErrorText\(lang, bootError\.code, bootError\.retryAfter\) : t\(lang, "errNetwork"\)\}/);
});

test("the back arrow on the 'Can't reach the server' screen leaves for the login screen instead of doing nothing", () => {
  assert.match(app, /const handleLogout = \(\) => \{ if \(SERVER_MODE\) api\.logout\(\); resetSession\(\); setBootError\(false\); setBooting\(false\); setEntry\("welcome"\); \};/);
  assert.match(app, /const leaveSavedLogin = \(\) => \{ handleLogout\(\); setEntry\("login"\); \};/);
  assert.match(app, /onBack=\{leaveSavedLogin\}/);
});

test("every answer and status handler sends a study event, and the XP guess is paired with it", () => {
  assert.equal((app.match(/sendStudy\(answerEvent\(ex, result, meta\), result === "correct" && !already \? XP_PER_CORRECT : 0\)/g) || []).length, 2);
  assert.equal((app.match(/sendStudy\(statusEvent\(ex, status\), status === "completed" && !already \? XP_PER_CORRECT : 0\)/g) || []).length, 2);
  assert.match(app, /sendStudy\(boxEvent\(\{ setKey, total, retried, itemId: out\.result\.itemId \}\), out\.result\.xp\)/);
  assert.match(app, /sendStudy\(diagnosticEvent\(\)\)/);
});

test("the server's XP replaces the on-screen guess, and an event the server refuses also takes its guess back", () => {
  assert.match(app, /onApplied: \(ev, res\) => \{ applySummary\(res\.summary\); refund\(ev\); \}/);
  assert.match(app, /onDropped: refund/);
  assert.match(app, /const refund = \(ev\) => \{ if \(ev\._award\) setBonusXp\(\(x\) => Math\.max\(0, x - ev\._award\)\); \}/);
});

test("streak and weekly hours come from the server summary when there is one", () => {
  assert.match(app, /const liveStreak = summary \? summary\.streak : streakStats\.streak;/);
  assert.match(app, /summary \? summary\.weekHours : buildWeeklyStudyHours/);
  assert.match(app, /streak: liveStreak, longestStreak: liveLongestStreak/);
});

test("progress is saved to the server only after the account has loaded, and never right after loading it", () => {
  const save = between("// Save progress to the server a moment after the last change", "// Keep the screen in step with the server");
  assert.match(save, /!hydratedRef\.current\) return;/);
  assert.match(save, /json === lastSavedRef\.current\) return;/);
  assert.match(save, /saverRef\.current\.schedule\(state\)/);
});

test("what is saved to the server is progress only: never XP, the plan, or the password", () => {
  assert.match(app, /stateToSave\(\{ topicMastery, uniTopicMastery, practice, uniPractice, langResults, rewards \}\)/);
  assert.doesNotMatch(app, /putState\([^)]*password/);
});

test("the plan talks to the server in order, and undoes a change the server refused", () => {
  const plan = between("const planChange = ", "const handleAnswer = ");
  assert.match(plan, /api\.patchPlanTask\(sid, \{ done \}\)/);
  assert.match(plan, /api\.addPlanTask\(/);
  assert.match(plan, /api\.deletePlanTask\(sid\)/);
  assert.match(plan, /planOps\.current = planOps\.current\.then\(job\)/);
  assert.match(plan, /flash\("errPlanSave"\)/);
});

test("a rejected token sends the student back to the login screen", () => {
  assert.match(app, /api\.onUnauthorized\(\(\) => \{ resetSession\(\); setEntry\("login"\); flash\("errSession"\); \}\)/);
});

test("the forgot-password screen is reachable from Login and signs the student in afterwards", () => {
  assert.match(app, /onForgot=\{\(\) => setEntry\("forgot"\)\}/);
  assert.match(app, /entry === "forgot" && SERVER_MODE\) return <>\{noticeToast\}<ForgotPassword/);
  assert.match(app, /onSignedIn=\{handleSignedIn\}/);
  assert.match(app, /api\.forgotPassword\(\{ login: login\.trim\(\) \}\)/);
  assert.match(app, /api\.resetPassword\(\{ login: login\.trim\(\), code: code\.trim\(\), password \}\)/);
});

test("with a server, sign-up needs a valid email and a password of 8+ characters", () => {
  assert.match(app, /\(!SERVER_MODE \|\| \(\/\^\[\^\\s@\]\+@\[\^\\s@\]\+\\\.\[\^\\s@\]\+\$\/\.test\(form\.email\.trim\(\)\) && form\.password\.length >= 8\)\)/);
});

test("both languages have every message the server flow can show", () => {
  const keys = [
    "errInvalidCredentials", "errTooManyWait", "errEnterEmailPassword", "errPhoneTaken", "errEmailTaken", "errValidation", "errTooMany", "errNetwork",
    "errServer", "errSession", "errInvalidCode", "errNoEmail", "errEmailFailed", "errPlanLimit", "errPlanSave", "errSaveProgress",
    "errPasswordShort", "retryWord", "passwordHint", "emailResetHint", "forgotLink", "forgotTitle", "forgotDesc", "forgotSendCode",
    "forgotCodeSent", "forgotCodeExpires", "forgotCodeLabel", "forgotNewPasswordLabel", "forgotResetBtn", "forgotResend",
    "forgotLoginLabel", "backToLogin", "forgotSendingTitle", "forgotSendingSub", "forgotCodeSentGeneric", "forgotCheckEmailTitle", "forgotCheckSpam", "forgotStep2Desc",
  ];
  for (const key of keys) {
    const hits = app.match(new RegExp(`[\\s,{]${key}:`, "g")) || [];
    assert.equal(hits.length, 2, `${key} should be defined once in English and once in Khmer, found ${hits.length}`);
  }
});

test("while the code is being emailed the student sees the friendly sending card, and afterwards the check-your-email card", () => {
  assert.match(app, /sending \? <SendingCard lang=\{lang\} \/> : \(/);
  assert.match(app, /<CheckEmailCard lang=\{lang\} email=\{maskedEmail\} \/>/);
  assert.match(app, /useReducedMotion\(\)/); // the animation stands still for people who ask for reduced motion
});

test("the plan's subject picker lists the student's real subjects (their chosen foreign language), not the placeholder", () => {
  assert.match(app, /const subjectOptions = fieldSubjects\(p\.field, p\.foreignLanguage\);/);
  assert.doesNotMatch(app, /const subjectOptions = FIELD_SUBJECTS\[p\.field\]/);
});

test("the diagnostic is built in sections from diagnosticPlan, not from every question of every subject", () => {
  assert.match(app, /import \{[^}]*buildSections[^}]*\} from "\.\/diagnosticPlan\.js";/);
  const diag = app.slice(app.indexOf("function Diagnostic("), app.indexOf("function DiagnosticResults("));
  assert.match(diag, /buildSections\(reg\.field, \(s\) => getExercises\(s, lang\)\)/);
  assert.match(diag, /locate\(sections, i\)/); // "Section 2 of 4 · Question 5 of 12"
  assert.match(diag, /t\(lang, "sectionWord"\)/);
  assert.doesNotMatch(app, /fieldSubjects\(reg\.field, reg\.foreignLanguage\)\.flatMap\(/); // the old queue of every question (about 890 for Science)
});

test("the diagnostic results list only the subjects the test covered", () => {
  const results = app.slice(app.indexOf("function DiagnosticResults("), app.indexOf("function Majors("));
  assert.match(results, /diagnosticSubjects\(reg\.field\)\.map/);
});

test("a track with no diagnostic (Social Science) goes from sign-up straight to the dashboard", () => {
  const reg = app.slice(app.indexOf("const handleRegister = async"), app.indexOf('// "Back" from the step-4'));
  assert.match(reg, /if \(!hasDiagnostic\(reg\.field\)\) return enterDashboard\(reg\);/);
  // after the account is created or updated, before the assessment screen would be queued
  assert.ok(reg.indexOf("api.register(") < reg.indexOf("hasDiagnostic(reg.field)"));
  assert.ok(reg.indexOf("hasDiagnostic(reg.field)") < reg.indexOf("setPendingReg(reg)"));
});

test("'Explore first' and the Social Science skip share one way into the dashboard, which reports a failure to load the account", () => {
  const enter = app.slice(app.indexOf("const enterDashboard = async"), app.indexOf("// Completing the diagnostic later"));
  assert.match(enter, /await loadAccount\(\); setPendingReg\(null\); return null;/);
  assert.match(enter, /return \{ error: err\?\.code \?\? "server_error", retryAfter: err\?\.retryAfter \?\? null \};/);
  assert.match(enter, /const built = buildProfile\(reg\);/); // the browser-only mode builds the profile from the answers it was handed, not from state
  assert.match(enter, /const handleSkipDiagnostic = async \(\) => \{ const res = await enterDashboard\(pendingReg\); if \(res\) flash\(apiErrorKey\(res\.error\)\); \};/);
});

test("the diagnostic's new 'Section' word exists in both languages, and the coach no longer sends students to a diagnostic that may not exist", () => {
  assert.equal((app.match(/[\s,{]sectionWord:/g) || []).length, 2);
  assert.doesNotMatch(app, /complete the diagnostic assessment/);
  assert.match(app, /answer a few practice questions so I can ground this in your real mastery/);
});
