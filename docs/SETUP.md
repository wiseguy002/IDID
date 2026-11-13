# Setting up iDID online

iDID works fully on one device with no setup. Follow these steps to host it for free on the web and to turn on the **online trust circle** (sync between people's own devices, invites, and push notifications).

You will need: a free [Supabase](https://supabase.com) account and this GitHub repository. It takes about 30 minutes.

---

## 1. Put the website and app online (Cloudflare, free)

Follow **[DEPLOY.md](DEPLOY.md)**. When it's done, the website is at `https://idid.care` and the app at `https://app.idid.care`.

At this point iDID works on-device only. People can install it from the browser menu with **Add to Home Screen** or **Install app**.

## 2. Create the Supabase project

1. Create a new project at supabase.com. Choose a region close to your users and keep the database password somewhere safe.
2. Open **SQL Editor** and run each file in `supabase/migrations/` in filename order (oldest first). Or, with the Supabase CLI linked (step 4), run `supabase db push`. When you update iDID later, run any new migration files the same way before deploying the app.
3. Under **Project Settings → API**, note the **Project URL** and the **anon public** key.

## 3. Sign-in emails

iDID signs people in with a 6-digit code from their email. A code is more reliable than a link when iDID is installed as an app.

1. **Authentication → Providers → Email**: make sure Email is enabled. Turn on "Confirm email".
2. **Authentication → Email Templates → Magic Link** and **Confirm signup**: include the code, for example (on the free plan, Supabase only lets you edit templates after custom SMTP is set up in step 4 below; until then its default emails send a sign-in link, which works when opened on the same device):

   ```html
   <h2>Your iDID sign-in code</h2>
   <p>Enter this code in iDID: <strong>{{ .Token }}</strong></p>
   <p>Or <a href="{{ .ConfirmationURL }}">tap here to sign in</a> on this device.</p>
   ```

3. **Authentication → URL Configuration**: set **Site URL** to `https://app.idid.care` and add it under **Redirect URLs**.
4. **Send sign-in emails through Resend.** Supabase Auth sends iDID's only automatic emails (the 6-digit sign-in codes), and its built-in sender allows just a couple an hour. Under **Project Settings → Authentication → SMTP Settings**, turn on **Enable Custom SMTP** and enter:

   | Setting | Value |
   |---|---|
   | Sender email | the address part of `EMAIL_FROM`, e.g. `idid@beepboopmail.com` (its domain must be verified in Resend) |
   | Sender name | `iDID` |
   | Host | `smtp.resend.com` |
   | Port | `465` |
   | Username | `resend` |
   | Password | your Resend API key |

   Also set **Authentication → Providers → Email → Email OTP length** to 6, the length iDID asks for.

5. **Server-side email (optional).** Edge functions send email with `supabase/functions/_shared/email.ts`, which reads `RESEND_API_KEY` and `EMAIL_FROM`. Copy `supabase/functions/.env.example` to `supabase/functions/.env` (git-ignored), fill in the real values, then from the repository root:

   ```bash
   supabase secrets set --env-file supabase/functions/.env --project-ref nnyoiljgxnpyuiersruz
   ```

   To check it, send yourself a test: `RESEND_API_KEY=… EMAIL_FROM="iDID <idid@beepboopmail.com>" node --experimental-strip-types scripts/send-test-email.mts you@example.com`.

   Invite links and care-team links are never emailed by the server: they carry decryption keys, so they're shared from the person's own device.

## 4. Push notifications

1. Generate a key pair once, on any computer with Node.js:

   ```bash
   npx web-push generate-vapid-keys
   ```

2. Install the [Supabase CLI](https://supabase.com/docs/guides/cli), then from the repository root:

   ```bash
   supabase login
   supabase link --project-ref YOUR-PROJECT-REF
   supabase secrets set VAPID_PUBLIC_KEY=... VAPID_PRIVATE_KEY=... VAPID_SUBJECT=mailto:you@example.com CRON_SECRET=$(openssl rand -hex 24)
   supabase functions deploy send-push
   ```

   Keep the private key and `CRON_SECRET` secret. Never put them in the app or the repository.

3. In the **SQL Editor**, open `supabase/setup-cron.sql`, replace `YOUR-PROJECT-REF` and `YOUR-CRON-SECRET`, and run it. This checks for due reminders every minute.

## 5. Connect the web app to Supabase

Put the three public values in `app/.env.production` and commit it:

| Name | Value |
|---|---|
| `VITE_SUPABASE_URL` | Project URL from step 2 |
| `VITE_SUPABASE_ANON_KEY` | anon public key from step 2 |
| `VITE_VAPID_PUBLIC_KEY` | public key from step 4 |

All three are safe to publish: access is enforced by the database's row-level security, and journal data is encrypted on the device before it is sent. Never put the service-role key, the VAPID private key or `CRON_SECRET` in this file. The deploy workflow builds with these values on the next push to `main`.

For local development, copy `app/.env.example` to `app/.env.local` and fill in the same values.

## 6. Make yourself an admin

To review and answer feature requests in the app (**Settings → Suggest a feature → Manage**), sign in to iDID once with your email, then run this in the SQL Editor:

```sql
insert into public.app_admins select id from auth.users where email = 'you@example.com';
```

You can also browse requests in **Table Editor → feedback**.

## 7. Try it

1. Open iDID, set up your journal, then go to **Circle → Connect devices & invite**.
2. Sign in with your email code, enter your journal passphrase, and choose **Create our circle**.
3. **Make an invite link** and send it privately to someone you trust. They open it, set up iDID, sign in, and join.
4. In **Settings → Notifications**, turn on notifications on each device.
5. On another phone or computer of your own, tap **I already use iDID** on the welcome screen, then sign in with the same email and your journal passphrase. Everything syncs down, and that device gets its own recovery code.

> **iPhone and iPad:** web push works only after iDID is added to the Home Screen (Share → Add to Home Screen) on iOS 16.4 or later.

## Checking the database rules locally

```bash
supabase/tests/run.sh   # needs PostgreSQL 16 installed; CI runs this on every pull request
```
