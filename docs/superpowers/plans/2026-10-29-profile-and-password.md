# Profile page and change password Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** A signed-in student can edit their details and change their password from a new Profile page.

**Architecture:** The backend gets one new endpoint, `PUT /me/password`; the details card needs nothing new there (`PATCH /me` already exists). The frontend adds `ProfilePage` in its own file (like `ExerciseUi.jsx`), pure helpers in a second file, and wires them into `App.jsx` through the header avatar and a sidebar link. Two repos, shipped backend first.

**Tech Stack:** Backend `C:\Users\Dell\bondus-backend`: Laravel on PHP 8.5, PHPUnit on in-memory SQLite, Sanctum tokens. Frontend `C:\Users\Dell\Bondus`: React 18 + Vite, tests with `node --test`.

**Spec:** `docs/superpowers/specs/2026-10-29-profile-and-password-design.md` (frontend repo)

## Global Constraints
- New password: 8 to 128 **characters** (the same rule as sign-up and reset). Name: required, at most 255. Age: 8 to 99 or empty. Email: a valid address.
- Rate limit `change-password`: 5 attempts per minute per student, and 10 wrong-password failures per 15 minutes per student (only `wrong_password` replies count as failures).
- Track and grade are read-only. University-track students edit only `name`, `email`, `age`, `reminderEmails`. Email changes never ask for a password.
- Every new string exists in English and Khmer (`STRINGS` in `App.jsx`); the Khmer is drafted by you and marked for the owner to proofread.
- `autocomplete` values: `name`, `email`, `current-password`, `new-password`. Field errors use `role="alert"`.
- Ship backend first, then frontend. **Ask the owner before each push** (a push to `main` deploys).
- Work in a fresh git worktree off `origin/main` per repo (the frontend checkout has unrelated staged files; link `node_modules` into the worktree with a junction). Commit with explicit paths and end messages with `Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>`.
- `ProfileUi.jsx` must not import from `App.jsx` (circular). `App.jsx` passes `FormField`, `SelectField`, `SubjectChip` and the sign-up option lists to it as props, so editing and sign-up share them.

## Review Focus
1. A legacy phone-only account (no email) can still save other fields; the reset-code link is hidden for it. (Task 3 `validateProfile`, Task 5 SSR test)
2. A stored value missing from an option list (exam year 2025, an unknown university) is still shown, and saving untouched does not change it. (Task 3 `withCurrentOption`, `diffProfile`)
3. Clearing optional fields sends `null` (age emptied, university set to "Not sure yet"), as the server's nullable list expects. (Task 3 `diffProfile`)
4. An email typed with spaces or capitals is not a "change", and is sent trimmed. (Task 3 `diffProfile`)
5. Password length counts characters, not UTF-16 units, so Khmer or emoji passwords obey 8 and 128 exactly like the server. (Task 3 `validatePasswordChange`)

## File Structure
| File | Responsibility |
|---|---|
| bondus-backend `app/Http/Controllers/ChangePasswordController.php` | verify current password, set the new one, revoke other tokens |
| bondus-backend `routes/api.php`, `app/Providers/AppServiceProvider.php` | route and the `change-password` limiter |
| bondus-backend `tests/Feature/ChangePasswordTest.php`, `docs/API.md` | tests and docs |
| `Frontend/api.js`, `Frontend/serverMapping.js` | `api.changePassword`; `wrong_password` error code |
| `Frontend/profileForm.js` | pure helpers: editable fields, form, diff, validation, error mapping, string-key list |
| `Frontend/ProfileUi.jsx` | `ProfilePage`: details card and password card |
| `Frontend/App.jsx` | avatar button, sidebar link, `view.profile`, handlers, strings |
| `Frontend/profileForm.test.js`, `profileUi.ssr.test.js`, `profileWiring.test.js` | helper tests, render tests, wiring guards |

---

### Task 1: Backend `PUT /me/password`  (repo: bondus-backend)

**Files:** Create `app/Http/Controllers/ChangePasswordController.php`, `tests/Feature/ChangePasswordTest.php`. Modify `routes/api.php` (inside the `auth:sanctum` group, after `/me/summary`), `app/Providers/AppServiceProvider.php`, `docs/API.md` (after the `PATCH /me` paragraph).

**Interfaces:** Produces `PUT /api/v1/me/password`, body `{ currentPassword, password }` -> `200 { "changed": true }`; wrong current password -> `422 { message, code: "wrong_password" }`; invalid input -> `422 validation_failed` on `currentPassword` / `password`; no token -> 401; over the limit -> 429.

- [ ] **Step 1: Write the failing tests** in `ChangePasswordTest` (`RefreshDatabase`; users from `User::factory()->create(['email' => 'sokha@example.com', 'password' => 'old-password'])`; requests via `withToken($user->createToken('auth_token')->plainTextToken)->putJson('/api/v1/me/password', [...])`). Tests, with the assertions that matter:
  - `test_the_password_changes_and_the_old_one_stops_working`: 200 `changed` true; `POST /login` with `old-password` is 401 `invalid_credentials`, with `new-password` is 200.
  - `test_other_devices_are_signed_out_but_this_one_stays`: two tokens; change with the first; `$this->app['auth']->forgetGuards()`; the second token gets 401 on `GET /me`, the first gets 200; `assertDatabaseCount('personal_access_tokens', 1)`.
  - `test_a_wrong_current_password_changes_nothing`: 422, `assertJsonPath('code', 'wrong_password')`; login with `old-password` still 200.
  - `test_the_new_password_must_be_8_to_128_characters`: 7 chars and 129 chars give 422 with `errors.password`; 8 and 128 give 200; a missing `currentPassword` gives 422 with `errors.currentPassword`.
  - `test_it_needs_a_signed_in_student`: no token -> 401.
  - `test_six_attempts_in_a_minute_are_limited`: `freezeTime()`; five wrong attempts give 422 and the sixth gives 429.
  - `test_ten_wrong_guesses_in_fifteen_minutes_lock_further_attempts`: ten wrong attempts, `$this->travel(61)->seconds()` after each (so the per-minute limit never trips); the eleventh, even with the correct current password, is 429.
  - `test_validation_errors_do_not_use_up_the_wrong_guess_allowance`: ten requests with a 3-character new password and the right current password, travelling 61 s after each, then a valid request is 200.
- [ ] **Step 2: Run** `php artisan test --filter ChangePasswordTest`. Expect failures (route not found).
- [ ] **Step 3: Implement** `ChangePasswordController::__invoke(Request $request): JsonResponse` as in the spec: validate; `Hash::check` else 422 `wrong_password`; in one `DB::transaction` set the password (the `hashed` cast hashes it) and delete every token whose key differs from the current access token's. Register `Route::put('/me/password', ChangePasswordController::class)->middleware('throttle:change-password')`. In `AppServiceProvider::boot` add `RateLimiter::for('change-password', ...)` returning two limits keyed by `$request->user()?->id ?: $request->ip()`: `Limit::perMinute(5)` and `Limit::perMinutes(15, 10)->after(...)` where the callback is true only for a 422 JSON response whose `code` is `wrong_password` (same shape as the `login` limiter).
- [ ] **Step 4: Run** `php artisan test --filter ChangePasswordTest`, then `php artisan test`. Expect all pass.
- [ ] **Step 5: Document and commit.** Add `PUT /me/password` to `docs/API.md` (body, the three outcomes, "signs out every other device, keeps this one", the limits, "a Google-created account has no known password: use `/forgot-password` then `/reset-password`"). `git add` the five paths; commit `Add PUT /me/password to change a password while signed in`.

---

### Task 2: Frontend API client and error code

**Files:** Modify `Frontend/api.js` (accounts block, after `resetPassword`), `Frontend/serverMapping.js` (`API_ERROR_KEYS`), `Frontend/api.test.js`, `Frontend/serverMapping.test.js`.

**Interfaces:** Produces `api.changePassword({ currentPassword, password }) -> Promise<{ changed: true }>`; `API_ERROR_KEYS.wrong_password === "errWrongPassword"`.

- [ ] **Step 1: Write failing tests.** In `api.test.js`: after `api.login(...)` (fake server returns a token), `api.changePassword({ currentPassword: "old-pass-1", password: "new-pass-2" })` makes a call with `method "PUT"`, `url` `${BASE}/me/password`, `body` equal to `{ currentPassword: "old-pass-1", password: "new-pass-2" }` and `headers.Authorization` equal to `Bearer <that token>`. In `serverMapping.test.js`: `assert.equal(apiErrorKey("wrong_password"), "errWrongPassword")`.
- [ ] **Step 2: Run** `node --test Frontend/api.test.js Frontend/serverMapping.test.js`. Expect 2 failures.
- [ ] **Step 3: Implement** the one-line client method and the map entry.
- [ ] **Step 4: Run** the same command. Expect pass.
- [ ] **Step 5: Commit** `Frontend/api.js Frontend/serverMapping.js Frontend/api.test.js Frontend/serverMapping.test.js`: `Add api.changePassword and the wrong_password error code`.

---

### Task 3: `profileForm.js` pure helpers

**Files:** Create `Frontend/profileForm.js`, `Frontend/profileForm.test.js`.

**Interfaces:** Produces (all pure, no React):
- `editableFields(profile) -> string[]`: university profile -> `["name","email","age","reminderEmails"]`; high-school -> `["name","email","age","target","targetExamYear","dailyMinutes","targetUniversity","foreignLanguage","subjectsToImprove","reminderEmails"]`, without `foreignLanguage` unless `profile.field === "science"`.
- `profileToForm(profile) -> form`: editable fields only; `age` as a string (`""` when null); `reminderEmails` defaults to `true`; `subjectsToImprove` is a copy.
- `diffProfile(profile, form) -> object`: the `api.patchMe` body: only editable fields whose value changed. `age` `""` -> `null`, else `Number`; `targetUniversity` `""` -> `null`; email compared and sent trimmed and lowercased; `subjectsToImprove` compared as a set, sent whole.
- `validateProfile(profile, form) -> { [field]: errorKey }`: `name` blank or over 255 -> `"profileErrName"`; `email` invalid -> `"profileErrEmail"`, and empty is an error only when `profile.email` is set; `age` not an integer 8 to 99 (empty is fine) -> `"profileErrAge"`.
- `withCurrentOption(options, current) -> options`: adds `{ value: current, label: String(current) }` at the front when `current` is neither empty nor in `options`.
- `serverFieldErrors(err) -> { [field]: errorKey }`: `email_taken` -> `{ email: "errEmailTaken" }`; `validation_failed` with `err.errors` -> `"errValidation"` for each known editable field only; otherwise `{}`.
- `validatePasswordChange({ current, next, confirm }) -> { current?, next?, confirm? }`: `"passwordErrCurrentRequired"`, `"passwordErrTooShort"` (under 8 characters), `"passwordErrTooLong"` (over 128), `"passwordErrMismatch"`; length counted as `[...s].length`.
- `PROFILE_STRING_KEYS: string[]`: every `STRINGS` key the profile page uses (listed in Task 4).

- [ ] **Step 1: Write failing tests** with `const hs = { educationLevel: "highschool", field: "science", name: "Sokha Chan", email: "sokha@example.com", age: 17, target: "A", targetExamYear: 2027, dailyMinutes: 60, targetUniversity: "ITC", foreignLanguage: "English", subjectsToImprove: ["physics"], reminderEmails: true, grade: "12" }`:
  - `editableFields`: `hs` includes `foreignLanguage`; `{ ...hs, field: "social_science" }` does not; `{ educationLevel: "university" }` equals the four-field list.
  - `profileToForm`: `age` is `"17"`; `{ ...hs, age: null }` gives `""`; `reminderEmails` undefined gives `true`; pushing to `form.subjectsToImprove` leaves `hs.subjectsToImprove` unchanged.
  - `diffProfile`: untouched form -> `{}`; `{ ...form, name: "Sokha C." }` -> `{ name: "Sokha C." }`; `age: ""` -> `{ age: null }`; `age: "18"` -> `{ age: 18 }`; `targetUniversity: ""` -> `{ targetUniversity: null }`; `email: "  SOKHA@Example.com "` -> `{}`; `email: " New@Example.com "` -> `{ email: "new@example.com" }`; `subjectsToImprove` reordered -> `{}`, extended -> the full new array; a stored `targetExamYear: 2025` untouched -> `{}`.
  - `validateProfile`: blank name and a 256-character name -> `{ name: "profileErrName" }`; `"not-an-email"` -> `{ email: "profileErrEmail" }`; emptied email when `hs.email` is set -> error; empty email when the profile has none -> `{}`; age `"7"`, `"100"`, `"abc"`, `"17.5"` -> `{ age: "profileErrAge" }`; `""`, `"8"`, `"99"` -> `{}`.
  - `withCurrentOption([{ value: 2026, label: "2026" }], 2025).map(o => o.value)` equals `[2025, 2026]`; with `2026` or `""` the input is returned unchanged.
  - `serverFieldErrors`: `{ code: "email_taken" }` -> `{ email: "errEmailTaken" }`; `{ code: "validation_failed", errors: { age: ["x"], bogus: ["y"] } }` -> `{ age: "errValidation" }`; `{ code: "server_error" }` -> `{}`.
  - `validatePasswordChange`: empty `current` -> `passwordErrCurrentRequired`; `next` of 7 characters -> `passwordErrTooShort`; 129 -> `passwordErrTooLong`; 128 and 8 -> fine; `"😀".repeat(8)` and `"😀".repeat(128)` fine, `"😀".repeat(7)` too short; `confirm` different -> `passwordErrMismatch`; all valid -> `{}`.
  - Every error key those functions can return (`profileErr*`, `passwordErr*`, `errEmailTaken`, `errValidation`) is in `PROFILE_STRING_KEYS`; no duplicates.
- [ ] **Step 2: Run** `node --test Frontend/profileForm.test.js`. Expect failure (module missing).
- [ ] **Step 3: Implement** the module to the signatures above.
- [ ] **Step 4: Run** it. Expect all pass.
- [ ] **Step 5: Commit** `Frontend/profileForm.js Frontend/profileForm.test.js`: `Add the profile form helpers`.

---

### Task 4: Profile page (details card), strings, wiring

**Files:** Create `Frontend/ProfileUi.jsx`, `Frontend/profileUi.ssr.test.js`, `Frontend/profileWiring.test.js`. Modify `Frontend/App.jsx`.

**Interfaces:** Consumes Task 3. Produces `ProfilePage({ profile, lang, tr, serverMode, parts, lists, errorText, onSaveDetails, onChangePassword, onRequestResetCode, onConfirmResetCode })` exported from `ProfileUi.jsx`, with `parts = { FormField, SelectField, SubjectChip }`, `lists = { examYears, studyMinutes, universities, foreignLanguages, targetGrades }` (from `EXAM_YEARS`, `STUDY_MINUTES`, `UNIS`, `FOREIGN_LANGUAGES`, `["A","B","C","D","E"]`) and `errorText(code, retryAfter) -> string` (wraps `apiErrorText(lang, ...)`). `onSaveDetails(fields) -> Promise<{ ok: true } | { ok: false, errors: {field: key}, message?: string }>`. Password handlers are used in Task 5.

String keys (English copy; Khmer drafted by you), all added to both language tables in `App.jsx` and listed in `PROFILE_STRING_KEYS` together with the existing `errEmailTaken`, `errValidation`, `errServer`, `errNoEmail`, `errEmailFailed`, `errInvalidCode`, `errTooMany`, `errNetwork`:
`profileTitle` "Profile", `profileDesc` "Update your details and study goals.", `profileOpen` "Open your profile", `profileDetailsHeading` "Your details", `profileNameLabel` "Full name", `profileEmailLabel` "Email", `profileAgeLabel` "Age", `profileGoalsHeading` "Study goals", `profileLockedNote` "Track and grade are set when you sign up and can't be changed here.", `profileReminderLabel` "Study reminder emails", `profileReminderHint` "A friendly email if you haven't studied for a few days.", `profileSave` "Save changes", `profileSaving` "Saving…", `profileSaved` "Saved", `profileErrName` "Please enter your name.", `profileErrEmail` "Please enter a valid email address.", `profileErrAge` "Age must be between 8 and 99.", `passwordHeading` "Password", `passwordCurrentLabel` "Current password", `passwordNewLabel` "New password", `passwordConfirmLabel` "Confirm new password", `passwordChange` "Change password", `passwordChanging` "Changing…", `passwordChanged` "Password changed. Other devices were signed out.", `errWrongPassword` "That isn't your current password.", `passwordErrCurrentRequired` "Enter your current password.", `passwordErrTooShort` "Use at least 8 characters.", `passwordErrTooLong` "Use at most 128 characters.", `passwordErrMismatch` "The two passwords don't match.", `passwordForgotLink` "Don't know your current password? Email me a reset code", `passwordCodeSent` "We sent a code to {email}.", `passwordCodeLabel` "Code from the email", `passwordResetSubmit` "Set password", `passwordCancel` "Cancel".

- [ ] **Step 1: Write failing tests.**
  - `profileUi.ssr.test.js` (pattern: `startSsr()`, `s.load("/Frontend/ProfileUi.jsx")`, `s.render(s.h(ProfilePage, props))`, stub `parts` that render their label, `tr = (k) => k`): a high-school science profile renders the name and email inputs, the goal fields, the `profileLockedNote` and the track and grade values; a social-science profile has no foreign-language field; a university profile renders only name, email, age and the reminder switch (no goals, no `profileGoalsHeading`); a stored `targetExamYear: 2025` appears among the exam-year options.
  - `profileWiring.test.js` (reads `App.jsx` and `ProfileUi.jsx` as text): `App.jsx` imports `ProfilePage` from `./ProfileUi.jsx` and `PROFILE_STRING_KEYS` from `./profileForm.js`; has a `profile:` entry in the `view` map; the avatar is a `<button>` calling `go("profile")` with `aria-label` from `profileOpen`; the sidebar has a Profile link above the log-out button; every key in `PROFILE_STRING_KEYS` appears at least twice as `key:` (English and Khmer tables); `ProfileUi.jsx` contains no `from "./App.jsx"`.
- [ ] **Step 2: Run** `node --test Frontend/profileUi.ssr.test.js Frontend/profileWiring.test.js`. Expect failures.
- [ ] **Step 3: Implement `ProfilePage`'s details card** in `ProfileUi.jsx` per the spec: form state from `profileToForm`, re-synced when `profile` changes; option lists via `lists` and `withCurrentOption`; goals fields only for fields in `editableFields(profile)`; read-only track and grade; **Save** enabled only when `diffProfile` is non-empty and not saving; on submit run `validateProfile`, show errors with `role="alert"`, else `onSaveDetails(diff)` and show `profileSaved` inline for 3 s (the existing toast is error-styled, so success is shown beside the button); show `errors` from the result via `serverFieldErrors`/`message`. Use `lang === "km"` → `eai-km` like neighbouring screens.
- [ ] **Step 4: Wire `App.jsx`.** Add the string keys to both tables; import the new modules; `view.profile`; make the header avatar a `<button>` (same look) calling `go("profile")`; add a Profile link above Log out in the sidebar; add `handleSaveDetails(fields)`: with `SERVER_MODE`, `api.patchMe(fields)` then `setProfile(cur => ({ ...cur, ...rest }))` where `rest` is `userToProfile(res.user)` without `level`, `xp`, `xpToNext`; without it, `setProfile(cur => ({ ...cur, ...fields }))`; failures return `{ ok: false, errors: serverFieldErrors(err), message: apiErrorText(lang, err.code, err.retryAfter) }`.
- [ ] **Step 5: Run** the new tests, then the whole frontend suite: `node --test $(git ls-files 'Frontend/*.test.js' 'Frontend/**/*.test.js')`. Expect all pass.
- [ ] **Step 6: Check in a browser** (browser-only mode, `VITE_API_URL=` empty): avatar and sidebar link open the page; edit name and age, Save, see "Saved", header initials update; Save is disabled when nothing changed.
- [ ] **Step 7: Commit** the new files and `Frontend/App.jsx`: `Add the Profile page with editable details`.

---

### Task 5: Password card and reset-code path

**Files:** Modify `Frontend/ProfileUi.jsx`, `Frontend/App.jsx`, `Frontend/profileUi.ssr.test.js`, `Frontend/profileWiring.test.js`.

**Interfaces:** Consumes Task 2 and 4. Handlers defined in `App.jsx` and passed to `ProfilePage`, each returning `{ ok: true, ... } | { ok: false, code, retryAfter? }`:
- `onChangePassword({ currentPassword, password })` -> `api.changePassword`.
- `onRequestResetCode()` -> `api.forgotPassword({ login: profile.email })`; success `{ ok: true, maskedEmail }`; when `isCodeAlreadySent(err)` also `{ ok: true, maskedEmail: err.body?.maskedEmail }`.
- `onConfirmResetCode({ code, password })` -> `api.resetPassword({ login: profile.email, code, password })` (the client stores the fresh token itself).

- [ ] **Step 1: Write failing tests.** SSR: with `serverMode: true` the password card renders three password inputs with `autocomplete` `current-password`, `new-password`, `new-password` and the `passwordForgotLink` text; with `serverMode: false` there is no password card; with `serverMode: true` and `profile.email` null the link is absent (Review Focus 1). Wiring: `App.jsx` defines `handleChangePassword`, `handleRequestResetCode`, `handleConfirmResetCode` and passes them to `ProfilePage`.
- [ ] **Step 2: Run** the two test files. Expect failures.
- [ ] **Step 3: Implement** the password card: `validatePasswordChange`, then `onChangePassword`; on success clear the fields and show `passwordChanged`; on failure show `errorText(code, retryAfter)` under the matching field (`wrong_password` under the current-password field). The reset link expands an inline two-step form: request the code (show `passwordCodeSent` with the masked email), then code and new password (`validatePasswordChange` on the new password and its confirm) -> `onConfirmResetCode`; success clears the form and shows `passwordChanged`; errors via `errorText`. Both buttons are disabled while a request is in flight.
- [ ] **Step 4: Run** the two files, then the whole frontend suite. Expect all pass.
- [ ] **Step 5: Commit** the four paths: `Add change password and the email reset-code path to the Profile page`.

---

### Task 6: End-to-end check and release

**Files:** none (verification, then pushes).

- [ ] **Step 1: Run both full suites:** `php artisan test` (backend) and the frontend suite. Expect all pass.
- [ ] **Step 2: Real-browser check** using `reference-local-server-mode-repro.md` (local Laravel on sqlite with `MAIL_MAILER=log`, Vite with `VITE_API_URL`): register a student; edit name and goals, refresh, see them persisted; change the password with a wrong and then the right current password; in a second browser session confirm the old token now fails with the session-expired notice; log out and in with the new password; request a reset code (read it from `storage/logs/laravel.log`), set a new password, and confirm this session stays signed in. Expected: every step as described; no console errors.
- [ ] **Step 3: Ask the owner to approve the backend push.** Then push bondus-backend `main`, wait for the deploy, and confirm `PUT /api/v1/me/password` without a token returns 401 (not 404).
- [ ] **Step 4: Ask the owner to approve the frontend push.** Then push `main`, wait for the new bundle (poll the live bundle for the string `profileOpen`), and ask the owner to sign in and try the page; remind them the Khmer text needs proofreading.
