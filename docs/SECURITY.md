# How iDID protects your information

iDID is built so that the people running the server **cannot read your journal**. This page explains how, and the limits.

## On your device

- Everything is stored in the browser's IndexedDB, with **each record encrypted separately** using AES-256-GCM. The record's kind and id are bound in as additional authenticated data, so records can't be swapped or altered unnoticed.
- The encryption key is protected by your **passphrase** (PBKDF2-SHA-256, 600,000 iterations) and separately by a **recovery code** (125 bits of randomness). Neither the passphrase nor the code is ever stored.
- While iDID is locked, decrypted data is not kept in memory. iDID locks automatically after time in the background (5 minutes by default; adjustable in Settings).
- A few comfort settings (theme, text size, the reminder time) are stored unencrypted so the lock screen can look right. They contain nothing you wrote.
- **Always private kinds:** the inner board, body basics, medications, comfort kit, therapy prep, check-ins, activity, care shares, the "Who's here" fronting log (`fronts`), voice notes (`voice`) and weekly reflections (`reflections`) are always encrypted with the person's own key when synced, never the circle key.
- **Voice notes** are recorded with `MediaRecorder` at 24 kbit/s, capped at 2 minutes, and stored base64-encoded inside an ordinary encrypted record (well under the server's 1 MB per-record limit). The microphone is only requested when someone taps Record, and the Permissions-Policy allows it for the app's own origin only.

## Sharing with a circle (end-to-end encryption)

- Each account has a P-256 key pair. The private key is uploaded only after being encrypted with a key derived from your passphrase, so you can sign in on a new device. The server can't decrypt it.
- Each circle has its own AES-256 key, **sealed separately to each member's public key**. Invite links carry a one-time secret in the `#fragment`, which browsers never send to servers. That secret unlocks the circle key for the invitee, who then re-seals it to their own key.
- Every record is re-encrypted with the circle key before upload. Record ids on the server are keyed hashes (HMAC), so **the server can't tell entries from parts, people or appointments**.
- **"Only me" entries** are encrypted with a personal key that only your own devices hold, so other circle members can't read them either.
- The same personal key always protects the **inner board, body basics, medications, comfort kit, therapy prep, check-ins and Explore progress**. Safety plans use it too, unless the person chooses to share their plan with the circle.
- **Quick hide** clears decrypted data from memory (the same as locking) and shows an ordinary-looking screen; getting back in needs the passphrase.

## Circle key rotation

- When the owner removes someone, the app makes a new circle key (`rotateCircleKey` in `app/src/sync/keys.ts`):
  1. In one database transaction (`rotate_circle_key`, owner only), it replaces every remaining member's sealed copy of the key, saves the **keyring** record (fixed id `keyring-circle-v1`, encrypted with the new key, holding the earlier keys and the record-id seed) and cancels unused invite links, which carry the old key. The server refuses unless every current member is included. Because it's all or nothing, no device can ever get the new key without the keyring, or the other way round.
  2. It re-encrypts every shared record with the new key (`reencryptCircle`). If this is interrupted, the owner's device remembers and finishes it the next time it connects. Rows not yet re-encrypted stay readable to members through the keyring.
- **Only `rotate_circle_key` can write the keyring.** The ordinary record policies refuse that id, so a member's device can't replace or damage it.
- **Record ids don't change.** They're derived from the circle's first key, which is kept in the keyring. So "only me" records, which only their owner can decrypt, stay valid without being touched.
- **Other members' devices** notice the newer keyring, reopen the circle with their new copy of the key, and keep syncing. A row that a lagging device wrote with an old key is still readable, and the owner's devices save it again with the new key. A row no known key opens is skipped for now and read again once a newer key arrives.
- **A removed person's device** finds it is no longer in the circle and stops syncing. Their journal stays on their device.
- **What it doesn't do:** take back anything the removed person already downloaded. The earlier keys stay readable to current members (in the keyring) so nothing is lost.

## Access in a circle

- The circle's **owner** sets each person's role: **member** (can view and add) or **viewer** (view only). Roles are enforced by row-level security: viewers can read circle records but the server refuses their writes and invites, and only the owner can change roles (`set_member_role`). Members can't change their own role; only the sealed key column of their own membership is updatable.
- Invites carry the role chosen when they were made, and only the owner can make view-only invites.
- **Handing a circle over** (`transfer_ownership`) makes someone already in the circle the owner and the previous owner a member, and moves the circle's `created_by` so the circle no longer depends on the previous owner's account.
- Who an invite was for (a name and optional contact, used to show status and send reminders) is stored in the circle as an encrypted record, never in plain text on the server. Invite links are sent from the person's own device, so the key in the link never passes through iDID's servers.

## Therapist & care-team views

- A shared view is built on the person's device containing **only the categories they chose** (for example patterns, moments, notes, parts, safety plan, meds, appointments, therapy prep, and "only me" moments only if explicitly included), for a chosen time range.
- It's encrypted with AES-256-GCM using a **random key that exists only in the link** (after the `#`), with the view's id as associated data, and uploaded to `care_shares`. The server stores ciphertext only.
- Opening a link calls `get_care_share`, which returns the ciphertext for that one view and counts the open, so the person can see when it was last viewed. Expired and removed views return nothing; nobody can list views except their owner.
- Nothing is created without explicit consent to a plain-language summary, and changing what a view includes asks again. **Removing access** deletes the row, so the link stops working immediately.
- The view's key is stored in the person's journal encrypted with their personal key, so only their own devices can update or remove it.

## Support profile (ZIP code)

- Each person's ZIP code, support needs and saved contacts are stored encrypted like journal entries and synced end-to-end.
- iDID never looks anything up automatically. A third-party directory (for example Psychology Today or HRSA) only sees the ZIP code when someone taps a link that includes it.

## What the server can see

- Your email address (for sign-in) and which accounts share a circle.
- Sign-in protection: the "email me a code" form runs a Cloudflare Turnstile check (`app/src/components/Captcha.tsx`), which Supabase Auth verifies before sending any email. Turnstile sees ordinary page traffic only. Supabase also limits each IP address to 10 code requests and 15 code checks per 5 minutes, and the project to 60 emails per hour, so a bot can't drain the shared email allowance or guess codes.
- Email delivery: sign-in codes are sent by Supabase Auth through Resend, which sees the recipient's address and the code. Any server email (`supabase/functions/_shared/email.ts`) carries no journal content, names, or invite or shared-view links, since those links hold decryption keys.
- The size of each encrypted record and when it changed.
- The times of reminders you turn on, so push notifications can be sent. Notification text is always generic (for example, "You have an appointment in 1 hour") and never includes titles, names or places.
- Each person's role in a circle, and whether each invite has been used or has expired.
- For each shared view: its ciphertext, when it was last updated, how many times it was opened and when, and its end date if one is set.

## Help shape iDID (volunteer form)

- An optional form on the Suggest a feature screen (`app/src/lib/shape.ts`). It is stored as an ordinary feature request (`kind = 'other'`, fixed title), so it has the same RLS: the sender and app admins can read it. It is **not** end-to-end encrypted.
- It holds only what the person types: roles (which may reveal that they live with dissociation), a preferred way to take part, an optional name, a reply email and an optional note. The form says this, and requires a confirmation switch before sending.

## Opt-in anonymous counts

- Off by default (Settings → Privacy → Share anonymous counts; `app/src/lib/counts.ts`). While on, the device tallies screen opens by route name from a fixed list (capped at 200 per screen per week) in `localStorage` under `idid.counts`. The tally holds no content, names, parts or times.
- Once a week the previous week's tally is sent to `add_feature_counts(p_week, p_counts)` with the **anon key only** (`anonRpc`: no user session, `credentials: 'omit'`), so the request carries no account.
- The function only increments `feature_counts(week, feature, uses, people)` and `feature_count_reports(week, reports)`. There is no user, device, IP or timestamp column (enforced by an RLS test). Only app admins can select. Nobody can write directly. Input is validated: week format, feature-name pattern, numeric values, at most 60 keys.
- Limits: anyone could call the function to inflate totals. They are rough guidance, not billing data. Turning the setting off deletes unsent tallies.

## Limits to be aware of

- **Forgotten passphrase and lost recovery code:** the data can't be recovered by anyone. This is the cost of the server being unable to read it.
- **Circle members can read what's shared with the circle.** The "can see shared entries" setting controls what the app shows, but anyone holding the circle key could technically decrypt circle-shared records. Use "Only me" for anything that must stay with you.
- **Removing someone** from the circle stops them receiving new data from the server. Anything they already synced stays on their device. When the owner removes someone, the circle key is changed straight after (see "Circle key rotation" above), so their old copy of the key can't open anything written later, even if they somehow got hold of the server's data. If a member leaves by themselves, the owner can't yet change the key without removing someone.
- A circle member could overwrite or delete shared records. They can't forge readable content without the key, but they could vandalize it, so only invite people you trust, or give people **view only** access.
- **Anyone holding a shared-view link can open it.** Send it privately. Removing access stops it working, but anything already seen, saved or printed can't be taken back.
- Calendar exports (.ics or Google Calendar) leave iDID's encryption. iDID defaults to a neutral title and leaves out notes.
- Browser extensions and malware on a device can see anything shown on screen.

## Infrastructure hardening

- **Domain:** idid.care is registered with Cloudflare and signed with DNSSEC. CAA records allow only the certificate authorities Cloudflare uses (Let's Encrypt, Google Trust Services, SSL.com, DigiCert, Sectigo). SSL mode is Full (strict), TLS 1.2 is the minimum, and every page sends HSTS with preload.
- **Email authentication:** SPF and Resend's DKIM key are published, and DMARC is set to `p=quarantine`, so mail pretending to come from idid.care lands in spam. Aggregate reports go to hello@idid.care. Sending as an idid.care address from anywhere other than Resend (for example Gmail's "send mail as") will fail DMARC unless it goes through Resend's SMTP.
- **Headers:** both sites send a strict Content-Security-Policy (the app allows only itself, Supabase and Cloudflare's Turnstile), `X-Frame-Options: DENY`, `nosniff`, `Referrer-Policy: no-referrer` and a Permissions-Policy that turns off camera and location everywhere, and allows the microphone only on the app itself, for voice notes.
- **Dependencies:** CI fails if anything that ships to people has a known high-severity vulnerability (`npm audit --omit=dev`), and Dependabot opens weekly update PRs, each checked by the full CI.
- **Incidents:** see `docs/INCIDENT_RESPONSE.md`. Compliance status and owner to-dos are in `docs/COMPLIANCE.md`.
