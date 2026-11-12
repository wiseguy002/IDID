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

## Support profile (ZIP code)

- Each person's ZIP code, support needs and saved contacts are stored encrypted like journal entries and synced end-to-end.
- iDID never looks anything up automatically. A third-party directory (for example Psychology Today or HRSA) only sees the ZIP code when someone taps a link that includes it.

## What the server can see

- Your email address (for sign-in) and which accounts share a circle.
- The size of each encrypted record and when it changed.
- The times of reminders you turn on, so push notifications can be sent. Notification text is always generic (for example, "You have an appointment in 1 hour") and never includes titles, names or places.

## Limits to be aware of

- **Forgotten passphrase and lost recovery code:** the data can't be recovered by anyone. This is the cost of the server being unable to read it.
- **Circle members can read what's shared with the circle.** The "can see shared entries" setting controls what the app shows, but anyone holding the circle key could technically decrypt circle-shared records. Use "Only me" for anything that must stay with you.
- **Removing someone** from the circle stops them receiving new data from the server. Anything they already synced stays on their device. Rotating the circle key after a removal is planned.
- A circle member could overwrite or delete shared records. They can't forge readable content without the key, but they could vandalise it, so only invite people you trust.
- Calendar exports (.ics or Google Calendar) leave iDID's encryption. iDID defaults to a neutral title and leaves out notes.
- Browser extensions and malware on a device can see anything shown on screen.
