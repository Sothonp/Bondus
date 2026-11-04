# Continue with Facebook: setup

New accounts are made with **Google** or **Facebook** (typed-in email and password sign-up is closed: the backend answers 403
unless `SIGNUP_WITH_PASSWORD=true`). Google needs `GOOGLE_CLIENT_ID` / `VITE_GOOGLE_CLIENT_ID`. Facebook needs the steps below.
Until they are done, the Facebook button simply does not appear.

## 1. Make the Facebook app (about 15 minutes)

1. Go to <https://developers.facebook.com/apps>, **Create app**. Choose the use case **Authenticate and request data from users with
   Facebook Login**, and the app type **Consumer** if it asks.
2. **App settings → Basic**:
   - **App domains**: `bondus.tech`
   - **Privacy Policy URL**: a page on bondus.tech that says what you keep (name, email, study progress). Facebook will not let the
     app go Live without one.
   - **User data deletion**: choose "Data deletion instructions URL" and point it at a page that says how a student asks you to
     delete their account (for example, the email address to write to).
   - **Category**: Education.
   - Copy the **App ID** and the **App secret** (Show).
3. **Facebook Login → Settings**: turn on **Login with the JavaScript SDK** and add `https://www.bondus.tech` and `https://bondus.tech`
   to **Allowed domains for the JavaScript SDK**.
4. Permissions: `public_profile` and `email` need no review.
5. At the top of the dashboard switch the app from **Development** to **Live**. In Development mode only people you add as
   testers can sign in.

## 2. Put the keys where they belong

| Where | Name | Value |
|---|---|---|
| Vercel (website) | `VITE_FACEBOOK_APP_ID` | the App ID (public). Redeploy the site afterwards. |
| Render (Laravel backend) | `FACEBOOK_APP_ID` | the same App ID |
| Render (Laravel backend) | `FACEBOOK_APP_SECRET` | the App secret (**never** in the website or the repo) |

## How it works (for review)

The button opens Facebook's own login pop-up and gets an access token. The backend (`POST /auth/facebook`) does not trust it: it asks
Facebook (`debug_token`, with the app secret) that the token is valid and was issued to this app, then reads the person's id, name
and email. The same Facebook id is always the same account. An email from Facebook is never used to find or sign in to an existing
account, because Facebook does not vouch for emails as Google does, so a student who joined with Google and later taps Facebook gets
a separate account.
