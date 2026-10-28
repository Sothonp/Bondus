# Profile page and change password

Date: 2026-10-29. Status: design agreed in chat (the owner picked the editable fields and the Google-student behaviour, then said "yes"); this written spec is awaiting the owner's review before any plan or code.

## Goal
A signed-in student can change their own details and their password from inside the app. Today there is no profile screen (the header avatar is a plain circle), and no endpoint changes a password: it can only be set at sign-up or reset by email code.

## Decisions (owner's answers)
- **Editable:** name, email, age, study goals (target grade A to E, target exam year, daily study time, target university, subjects to improve, foreign language for the Science track) and the reminder-email switch.
- **Locked, shown read-only:** track (Science / Social Science) and grade (11 / 12), because they reshape the subjects, practice and diagnostic.
- **Password:** every student sees the same **Change password** form (current password, new password, confirm). Under it, a link **Don't know your current password? Email me a reset code** uses the existing forgot-password email flow. That link is how a student who signed up with Google (who never had a password) sets one.
- **Email changes do not ask for a password**, the same as `PATCH /me` today. Google students have no password to type.
- **University-track students** see name, email, age and the reminder switch only. Their major and other details live only in the browser, not on the server.

## Out of scope
Changing track or grade; a profile photo; deleting the account; verifying a new email address; a "sign out all devices" button; two-factor sign-in; a hard rule that the new password must differ from the old one.

## Frontend (this repo)
- **Entry points.** The header avatar becomes a button that opens the page (`go("profile")`), and a **Profile** link sits above **Log out** in the sidebar. `profile` is a new tab id with a `view.profile` entry in `App.jsx`; it is not added to `NAV`, so no sidebar tab highlights.
- **New files.**
  - `Frontend/ProfileUi.jsx`: `ProfilePage`, with the details card and the password card.
  - `Frontend/profileForm.js`: pure helpers, with no React or network: build the form from a profile, `diffProfile` (only what changed), field validation, and mapping a server `validation_failed` reply to field errors.
  - `Frontend/profileForm.test.js` and `Frontend/profileWiring.test.js`; the wiring test reads `App.jsx` as text, like `exerciseWiring.test.js`.
- **Details card.**
  - It reuses `FormField` / `SelectField` and the sign-up option lists (`EXAM_YEARS`, `STUDY_MINUTES`, the university and subject lists) so editing and sign-up cannot drift. If a stored value is not in a list, it is added to that list so the select shows it.
  - Client checks mirror the server: name required and at most 255 characters; a valid email; age 8 to 99 or empty; the other fields from their option lists.
  - **Save** is enabled only when something changed. It calls the existing `api.patchMe` with the changed fields only, then merges the returned user into `profile` through `userToProfile`, keeping the server's level and XP. A "Saved" toast confirms.
  - Errors: `email_taken` shows under the email field; `validation_failed` shows per field; anything else uses the existing `apiErrorKey` message.
  - Browser-only mode: the card saves to local state; the password card is hidden because that mode has no accounts.
- **Password card (server mode only).**
  - Rules: new password 8 to 128 characters, and the confirm field must match.
  - Submit calls a new `api.changePassword({ currentPassword, password })` (`PUT /me/password`). On success it clears the fields and shows "Password changed. Other devices were signed out."
  - Errors: `wrong_password` shows under the current-password field; `too_many_requests` shows the existing wait message built with `waitParts`.
- **Reset-code link.** It expands an inline two-step form inside the card.
  - Step 1 calls `api.forgotPassword({ login: profile.email })` and shows the masked email. `code_recently_sent` skips to step 2; `no_email_on_account` and `email_failed` use the existing messages.
  - Step 2 takes the code and a new password and calls `api.resetPassword`. Its reply carries a fresh token, which the client's existing `remember` step stores, so the student stays signed in on this device and every other device is signed out.
- **Strings.** Every new label and message gets English and Khmer entries in `STRINGS` in `App.jsx` (keys prefixed `profile` and `password`) plus `errWrongPassword`, and `API_ERROR_KEYS.wrong_password = "errWrongPassword"` in `serverMapping.js`. Claude drafts the Khmer; the owner proofreads, as for earlier features.
- **Accessibility.** Labels are tied to their inputs; `autocomplete` is `name`, `email`, `current-password` and `new-password`; field errors have `role="alert"`.

## Backend (bondus-backend)
- **Route.** `PUT /api/v1/me/password`, inside the `auth:sanctum` group, with a new `change-password` rate limiter.
- **Controller.** A new `ChangePasswordController` validates `currentPassword` (required, string, at most 128) and `password` (required, string, 8 to 128, the same as sign-up and reset).
  - If `Hash::check` fails it replies 422 `{ message, code: "wrong_password" }` and changes nothing.
  - Otherwise, in one transaction, it saves the new password and deletes every login token except the one making the request, then replies `{ "changed": true }`. Password reset already signs out everywhere, so this stays consistent, except that this device keeps its session.
- **Rate limit.** `change-password` allows 5 attempts per minute per student and 10 wrong-password failures per 15 minutes, mirroring `login`, so a stolen session token cannot be used to guess the current password.
- **No schema change.** An account created through Google has a random stored password, which is why it uses the reset-code path.
- **Docs.** Add the endpoint to the Accounts section of `docs/API.md`.

## Rollout
Backend first: a new endpoint changes nothing for the old frontend. Then the frontend. The change touches two repos and ships as two pushes in that order.

## Testing
- **Backend** (`Tests\Feature\ChangePasswordTest`, PHPUnit like the other feature tests):
  - success: the new password logs in and the old one does not;
  - other tokens are deleted and the current token still works;
  - a wrong current password returns 422 `wrong_password` and changes nothing;
  - validation: a short new password, and missing fields;
  - unauthenticated returns 401;
  - 429 after the limit.
- **Frontend unit:** `profileForm.js` (diff, validators, error mapping), `api.changePassword` in `api.test.js`, the new error code in `serverMapping.test.js`, and the wiring test.
- **In a real browser,** against a local backend on sqlite:
  - edit a name and goals and see them survive a refresh;
  - change the password with the right and the wrong current password;
  - confirm a second session's token stops working;
  - use the reset-code path (the mail log shows the code).

## Open items
Khmer proofreading; the owner confirming the backend-then-frontend deploy order.
