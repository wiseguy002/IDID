# Setting up IDID online

IDID works fully on one device with no setup. Follow these steps to host it for free on the web and to turn on the **online trust circle** (sync between people's own devices, invites, and push notifications).

You will need: a free [Supabase](https://supabase.com) account and this GitHub repository. It takes about 30 minutes.

---

## 1. Put the website and app online (Cloudflare, free)

Follow **[DEPLOY.md](DEPLOY.md)**. When it's done, the website is at `https://idid.care` and the app at `https://app.idid.care`.

At this point IDID works on-device only. People can install it from the browser menu with **Add to Home Screen** or **Install app**.

## 2. Create the Supabase project

1. Create a new project at supabase.com. Choose a region close to your users and keep the database password somewhere safe.
2. Open **SQL Editor** and run each file in `supabase/migrations/` in order (`…_idid_init.sql`, then `…_community.sql`). Or, with the Supabase CLI linked (step 4), run `supabase db push`.
3. Under **Project Settings → API**, note the **Project URL** and the **anon public** key.

## 3. Sign-in emails

IDID signs people in with a 6-digit code from their email. A code is more reliable than a link when IDID is installed as an app.

1. **Authentication → Providers → Email**: make sure Email is enabled. Turn on "Confirm email".
2. **Authentication → Email Templates → Magic Link**: include the code, for example:

   ```html
   <h2>Your IDID sign-in code</h2>
   <p>Enter this code in IDID: <strong>{{ .Token }}</strong></p>
   <p>Or <a href="{{ .ConfirmationURL }}">tap here to sign in</a> on this device.</p>
   ```

3. **Authentication → URL Configuration**: set **Site URL** to `https://app.idid.care` and add it under **Redirect URLs**.
4. For real use, set up custom SMTP under **Project Settings → Auth → SMTP**. Supabase's built-in email is rate-limited and meant for testing.

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

In GitHub, open **Settings → Secrets and variables → Actions → Variables** and add these repository variables:

| Name | Value |
|---|---|
| `SUPABASE_URL` | Project URL from step 2 |
| `SUPABASE_ANON_KEY` | anon public key from step 2 |
| `VAPID_PUBLIC_KEY` | public key from step 4 |

All three are public values; access is enforced by the database's row-level security. Re-run the deploy workflow.

For local development, copy `app/.env.example` to `app/.env.local` and fill in the same values.

## 6. Make yourself an admin

To review and answer feature requests in the app (**Settings → Suggest a feature → Manage**), sign in to IDID once with your email, then run this in the SQL Editor:

```sql
insert into public.app_admins select id from auth.users where email = 'you@example.com';
```

You can also browse requests in **Table Editor → feedback**.

## 7. Try it

1. Open IDID, set up your journal, then go to **Circle → Connect devices & invite**.
2. Sign in with your email code, enter your journal passphrase, and choose **Create our circle**.
3. **Make an invite link** and send it privately to someone you trust. They open it, set up IDID, sign in, and join.
4. In **Settings → Notifications**, turn on notifications on each device.

> **iPhone and iPad:** web push works only after IDID is added to the Home Screen (Share → Add to Home Screen) on iOS 16.4 or later.

## Checking the database rules locally

```bash
supabase/tests/run.sh   # needs PostgreSQL 16 installed; CI runs this on every pull request
```
