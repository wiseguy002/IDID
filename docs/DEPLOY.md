# Going live on idid.care (Cloudflare)

| Address | What | Cloudflare Pages project | Built from |
|---|---|---|---|
| `idid.care` and `www.idid.care` | Website | `idid-site` | `site/` |
| `app.idid.care` | The iDID app | `idid-app` | `app/` |

Both deploy automatically on every merge to `main` (`.github/workflows/deploy.yml`). Your domain is already on Cloudflare, so DNS and HTTPS certificates are set up for you when you attach the custom domains.

> **Status (12 November 2026):** the Pages projects `idid-site` and `idid-app` exist; `idid.care`, `www.idid.care` and `app.idid.care` are attached with DNS records; the www → idid.care redirect, Always Use HTTPS and minimum TLS 1.2 are on. What remains: the GitHub secrets (step 2), the first deploy (step 3), and email routing (step 6).

## 1. Create a Cloudflare API token (once)

1. Cloudflare dashboard → **My Profile → API Tokens → Create Token → Create Custom Token**.
2. Permissions: **Account → Cloudflare Pages → Edit** (enough for deploys). Account resources: your account.
3. Copy the token. Also copy your **Account ID** (dashboard home → right sidebar, or the URL).

## 2. Add them to GitHub (once)

Repository → **Settings → Secrets and variables → Actions**:

- **Secrets**: `CLOUDFLARE_API_TOKEN` (the token) and `CLOUDFLARE_ACCOUNT_ID`.
- **Variables** (optional until the online circle is set up, see `docs/SETUP.md`): `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `VAPID_PUBLIC_KEY`.

## 3. First deploy

Merge to `main`, or open **Actions → Deploy to Cloudflare Pages → Run workflow**. The two Pages projects must already exist; they do.

## 4. Attach the domains (once)

Cloudflare dashboard → **Workers & Pages**:

1. **idid-site → Custom domains → Set up a domain** → `idid.care`. Repeat for `www.idid.care`.
2. **idid-app → Custom domains → Set up a domain** → `app.idid.care`.

Cloudflare adds the DNS records and certificates automatically. It can take a few minutes.

## 5. Send www to the main address (recommended)

Dashboard → **idid.care zone → Rules → Redirect Rules → Create rule → "Redirect from WWW to root"** template. This sends `www.idid.care/anything` to `https://idid.care/anything` with a 301.

## 6. Email addresses (free)

The website lists `hello@`, `press@` and `privacy@idid.care`. In the **idid.care zone → Email → Email Routing**, enable routing and forward each address (or a catch-all) to your own inbox.

## 7. Recommended settings for privacy

- **SSL/TLS → Edge Certificates**: Always Use HTTPS = on; Minimum TLS = 1.2.
- **Web Analytics**: leave off, or use Cloudflare's cookie-free analytics only for the website (never the app), and say so on the privacy page.
- Security headers (HSTS, a strict Content Security Policy, no-referrer, no framing) ship with the site and app in their `_headers` files.

## 8. After the online circle is set up

In Supabase → **Authentication → URL Configuration**, set **Site URL** to `https://app.idid.care` and add it to **Redirect URLs**.

## Checking before you deploy

```bash
node site/tools/build-site.mjs && node site/tools/check-site.mjs   # website: links, phone layout, no third-party requests
cd site && npm install && npm run assets                           # regenerate images, icons and the flyer after design changes
```
