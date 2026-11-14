# Compliance and operations checklist

Where iDID stands on privacy law and account security, and what the owner still needs to do by hand. Last reviewed 13 November 2026.

> **Not legal advice.** The privacy policy (`site/pages/privacy.html`), terms of use (`site/pages/terms.html`) and incident plan (`docs/INCIDENT_RESPONSE.md`) were drafted carefully but **have not been reviewed by a lawyer.** Have a lawyer who knows US consumer health-privacy law review them before a public launch or press push.

## Laws that apply, and how iDID meets them

| Law | Applies? | How iDID handles it |
| --- | --- | --- |
| **HIPAA** | No. iDID isn't a covered entity (provider, plan or clearinghouse) or a business associate. | **Never say "HIPAA compliant"** in the app, site, press or app-store listings. Say "end-to-end encrypted; we can't read your journal" instead. |
| **FTC Act §5** (deception) | Yes | Every privacy claim on the site must be true and specific. `docs/SECURITY.md` is the source of truth. |
| **FTC Health Breach Notification Rule** | Yes (iDID is a personal health record vendor) | `docs/INCIDENT_RESPONSE.md`: notify people and the FTC within 60 days. |
| **Washington My Health My Data Act** | Yes, for WA users, with no size threshold | Privacy page "Consumer health data" and "Your privacy rights" sections, consent at setup, no sale, the provider list, and a 45-day response with an appeal route. |
| **Nevada SB 370, Connecticut CTDPA (health data)** | Yes | Same as Washington. |
| **California CCPA/CPRA** | Probably below the thresholds, but we follow it anyway | Rights to know, delete and correct; no sale or sharing; honors Global Privacy Control. |
| **California CMIA** | Possibly (it covers some mental-health apps) | Encryption, no disclosure without consent, and only the providers listed. |
| **COPPA** | iDID is for ages 13+ | Age confirmation at setup and sign-in. Delete any account found to belong to a child under 13. |

## Done

- Privacy policy covers consumer health data, rights and appeals, service providers, age, breach notice and changes.
- Terms of use: not medical care, crisis numbers, age 13+, acceptable use, as-is service, 30 days' notice before any shutdown.
- Setup asks people to confirm they're 13+ and agree to the terms (stored on the device as `termsAcceptedAt`). The sign-in forms carry the same notice.
- Sign-in protected by Cloudflare Turnstile and Supabase rate limits.
- DNSSEC, CAA, DMARC (`p=quarantine`), SSL Full (strict), HSTS preload.
- CI blocks known high-severity vulnerabilities in shipped code, and Dependabot is configured.

## Owner to-dos (need your logins)

These can't be done from the codebase. Each takes a few minutes.

### 1. Two-factor sign-in: done (13 November 2026)

Checked in the browser: GitHub (authenticator app and passkey), Cloudflare (authenticator app), Supabase (authenticator app, plus GitHub sign-in), Resend (MFA on, plus GitHub sign-in) and the Google account that receives hello@, privacy@ and press@ mail (passkeys, authenticator app).

### 2. GitHub repository settings: done (13 November 2026)

Secret scanning, push protection and Dependabot security updates are on. The "Protect Main" ruleset is active on the default branch: pull request required, checks `app`, `site` and `database` required, force pushes and deletion blocked. Actions workflow permissions are read-only.

### 3. Backups (on hold, owner's decision)

The Supabase free plan has no downloadable backups. Pick one:

- **Supabase Pro** ($25/month): daily backups kept 7 days, plus point-in-time recovery as an add-on. Simplest.
- **Free option:** add a `SUPABASE_DB_URL` repository secret and a scheduled GitHub Action that runs `pg_dump` weekly and stores the encrypted dump as a workflow artifact. Ask Claude to add the workflow once the secret exists.

### 4. Lawyer review (on hold, owner's decision)

Before a public launch, ask a lawyer to review the privacy policy, terms and incident plan. Ask specifically about:

- Washington MHMDA consent wording.
- Whether CMIA applies.
- Users aged 13–17.
- The limitation-of-liability wording for your state.

## Keep it true

- Any new data the server sees, or any new service provider, must be added to the privacy page, `docs/SECURITY.md` and the provider list *before* it ships.
- Analytics of any kind need explicit opt-in and an update to the privacy page. The only analytics today are the opt-in anonymous counts (privacy page "Anonymous counts"; ask the lawyer to confirm they're de-identified under WA MHMDA).
