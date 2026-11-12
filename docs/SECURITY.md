# How iDID protects your information

iDID is built so that the people running the server **cannot read your journal**. This page explains how, and the limits.

## On your device

- Everything is stored in the browser's IndexedDB, with **each record encrypted separately** using AES-256-GCM. The record's kind and id are bound in as additional authenticated data, so records can't be swapped or altered unnoticed.
- The encryption key is protected by your **passphrase** (PBKDF2-SHA-256, 600,000 iterations) and separately by a **recovery code** (125 bits of randomness). Neither the passphrase nor the code is ever stored.
- While iDID is locked, decrypted data is not kept in memory. iDID locks automatically after time in the background (5 minutes by default; adjustable in Settings).
- A few comfort settings (theme, text size, the reminder time) are stored unencrypted so the lock screen can look right. They contain nothing you wrote.

## Sharing with a circle (end-to-end encryption)

- Each account has a P-256 key pair. The private key is uploaded only after being encrypted with a key derived from your passphrase, so you can sign in on a new device. The server can't decrypt it.
- Each circle has its own AES-256 key, **sealed separately to each member's public key**. Invite links carry a one-time secret in the `#fragment`, which browsers never send to servers. That secret unlocks the circle key for the invitee, who then re-seals it to their own key.
- Every record is re-encrypted with the circle key before upload. Record ids on the server are keyed hashes (HMAC), so **the server can't tell entries from parts, people or appointments**.
- **"Only me" entries** are encrypted with a personal key that only your own devices hold, so other circle members can't read them either.
- The same personal key always protects the **inner board, body basics, medications, comfort kit, therapy prep, check-ins and Explore progress**. Safety plans use it too, unless the person chooses to share their plan with the circle.
- **Quick hide** clears decrypted data from memory (the same as locking) and shows an ordinary-looking screen; getting back in needs the passphrase.

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
- The size of each encrypted record and when it changed.
- The times of reminders you turn on, so push notifications can be sent. Notification text is always generic (for example, "You have an appointment in 1 hour") and never includes titles, names or places.
- Each person's role in a circle, and whether each invite has been used or has expired.
- For each shared view: its ciphertext, when it was last updated, how many times it was opened and when, and its end date if one is set.

## Limits to be aware of

- **Forgotten passphrase and lost recovery code:** the data can't be recovered by anyone. This is the cost of the server being unable to read it.
- **Circle members can read what's shared with the circle.** The "can see shared entries" setting controls what the app shows, but anyone holding the circle key could technically decrypt circle-shared records. Use "Only me" for anything that must stay with you.
- **Removing someone** from the circle stops them receiving new data from the server. Anything they already synced stays on their device. Rotating the circle key after a removal is planned.
- A circle member could overwrite or delete shared records. They can't forge readable content without the key, but they could vandalise it, so only invite people you trust, or give people **view only** access.
- **Anyone holding a shared-view link can open it.** Send it privately. Removing access stops it working, but anything already seen, saved or printed can't be taken back.
- Calendar exports (.ics or Google Calendar) leave iDID's encryption. iDID defaults to a neutral title and leaves out notes.
- Browser extensions and malware on a device can see anything shown on screen.
