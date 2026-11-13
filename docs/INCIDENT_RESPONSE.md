# Incident response plan

What to do if something goes wrong with iDID's security or availability. Keep this short enough to follow under stress. **Owner:** the iDID maintainer (contact via hello@idid.care). Review it once a year and after any incident.

> Draft for legal review. The notification deadlines below summarize the FTC Health Breach Notification Rule (16 CFR Part 318) and common US state law as understood in November 2026. Confirm them with a lawyer before relying on them.

## What counts as an incident

- Someone gets unauthorized access to the Supabase database, Supabase/Cloudflare/Resend/GitHub accounts, deploy secrets, or the domain.
- A code change (ours or a dependency's) could expose data, such as decrypted content, keys, invite or shared-view links, or email addresses.
- Sign-in or email abuse: a burst of sign-up codes, or emails sent that we didn't send.
- The app or website is defaced, or serves code we didn't ship.
- An outage that stops people reaching their journal or circle for more than a few hours.

Because journals are end-to-end encrypted and we never hold the keys, a database leak exposes **ciphertext plus the metadata listed in `docs/SECURITY.md`** (email addresses, circle membership, record sizes and times, reminder times, share-view counts). That metadata, and even the fact that someone has an iDID account, is treated as **consumer health data**. A leak of it is a reportable breach.

## First hour: contain

1. **Write down** what you saw, when, and how (screenshots, log lines). Start a private incident note and keep adding times.
2. **Cut access.** As needed:
   - Rotate the Supabase service-role key and JWT secret (Project Settings → API). This signs everyone out.
   - Rotate the Cloudflare API token, the Resend API key and the Turnstile secret, and update the Supabase SMTP and CAPTCHA settings and the GitHub repository secrets that use them.
   - Revoke suspicious GitHub tokens and deploy keys, and check the repo's audit log.
   - If the live app or site is serving bad code, roll back in Cloudflare Pages (Deployments → an earlier deployment → Rollback).
3. **Stop email abuse** if that's the problem: lower `rate_limit_email_sent` in Supabase Auth, or temporarily turn off sign-ups (`disable_signup`).
4. **Keep evidence.** Don't delete logs or the database. Take a database dump if you can.

## First three days: understand

- Which data was affected, for which accounts, and since when? Use Supabase logs, Cloudflare analytics and GitHub's audit log.
- Was anything readable exposed (decrypted content, keys, links with `#` secrets), or only ciphertext and metadata?
- Fix the cause, add a test or check that would have caught it, and ship the fix.

## Notify

If unsecured personal health information or account details were (or may have been) acquired without authorization:

| Who | When | How |
| --- | --- | --- |
| Affected people | Without unreasonable delay, **no later than 60 calendar days** after discovery | Email to the sign-in address, plus a notice in the app's What's new. Say what happened, what data, what we've done, what they can do, and how to reach us. |
| FTC | **500 or more people:** at the same time as notifying them. **Fewer than 500:** within 60 days after the end of the calendar year | The FTC's Health Breach Notification form (ftc.gov) |
| Media | **More than 500 residents of one state** | Prominent media outlets in that state |
| State attorneys general | As each state requires. Washington requires notice to the AG when 500+ residents are affected. | Each AG's breach-notification page |
| Service providers | If the breach was at Supabase, Cloudflare or Resend, they must notify us. Ask for details in writing. | |

Plain-language notice template:

> We're writing to let you know about a security incident affecting your iDID account. On [date], [what happened]. Your journal entries are encrypted on your device with a passphrase only you know, so they **were / were not** readable. The information involved was [email address / circle membership / …]. We have [fixed / rotated / …]. You don't need to do anything, but you can [change your passphrase in Settings / sign out of other devices]. Questions: privacy@idid.care.

## Afterward

- Write a short blameless review: timeline, cause, impact, what we changed.
- Add a line to `docs/SECURITY.md` if the protections changed, and to `CHANGELOG.md` if people need to know.

## Backups and recovery

- **Each person's device holds a full copy of their own journal.** The server holds encrypted copies for syncing and circles. People can also download full backups from Share & export, and the app encourages it.
- The Supabase project is on the free plan, which keeps **no downloadable backups**. Before inviting more than a small test group, move to Supabase Pro (daily backups kept 7 days), or add a scheduled `pg_dump` job (see `docs/COMPLIANCE.md`).
- If the database were lost, devices keep working offline. Circles would need to be set up again and re-shared from a device that still has the journal.
