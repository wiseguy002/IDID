# iDID capabilities memory bank

**As of v0.18.3, 2026-11-17.** (Unreleased changes on `main` since 0.18.3: email-link fix, offline page fix, stronger security headers, gentler wording, weDID family footer and crisis bar. No new features.)
Sources read: `CLAUDE.md`, `README.md`, `CHANGELOG.md`, `docs/` (SECURITY, COMPLIANCE, I18N, STRATEGY, SETUP, DEPLOY, features.json), the folder layout of `app/src`, `supabase/migrations` and `supabase/functions`, and the Settings screen. I did not read every screen's code, so anything marked *(unsure)* comes from notes only.

**Use this file before suggesting ideas.** If it's listed here, it's already built. Keep it plain-English.

## What iDID is
A private, end-to-end encrypted journal for dissociation, DID and trauma responses, for one person, a family, or a small "trust circle" (partner, family, therapist). Free, no ads, no trackers, no AI talking to you. It's "from weDID" (family brand, only in the site footer and Settings → About).
- **Website:** https://idid.care (static, in `site/`). **App:** https://app.idid.care (React + TypeScript installable web app, in `app/`, works offline).
- **Hosting:** Cloudflare Pages (`idid-site`, `idid-app`) + Supabase (database, sign-in, realtime, one push-sending function). Email via Resend. Sign-in bot check via Cloudflare Turnstile.
- **Code:** GitHub `wiseguy002/IDID`. Merge a PR to `main` and GitHub Actions deploys. Every PR gets a preview (`pr-<n>.idid-site.pages.dev` / `idid-app`). Supabase project `nnyoiljgxnpyuiersruz`.
- **Website words** can be edited in Mainframe (was Studio; mainframecms.com, also admin.wedid.care/content); edits become `mainframe/<hex>` branches (older `studio/<hex>`) with previews.

**Status tags:** ✅ Live · ⚙️ Live but off, or needs setup · 🧪 Built, never tried for real

## Privacy and encryption
- ✅ Everything stored on the device, each record encrypted separately (AES-256-GCM). Passphrase (PBKDF2, 600,000 rounds) + a recovery code. Forgotten passphrase *and* lost code = data gone for good (by design).
- ✅ Auto-lock (5 minutes by default, adjustable), Lock now, **Quick hide** (clears memory, shows an ordinary-looking screen).
- ✅ Change passphrase or recovery code; **Delete all data** (type "delete").
- ✅ End-to-end encrypted sync: the server stores only ciphertext. Record ids are keyed hashes, so the server can't tell entries from parts or appointments.
- ✅ "Only me" records use a personal key other circle members can't read. Always-private kinds: inner board, body basics, medications, comfort kit, therapy prep, check-ins, Explore progress, who's-here log, voice notes, weekly reflections, care shares.
- ✅ Circle key change when the owner removes someone (all-or-nothing in one database step; finishes itself if interrupted).
- ✅ Privacy policy + terms (age 13+, Washington/Nevada/Connecticut/California health-data wording), incident plan, security doc. Never say "HIPAA compliant".
- ✅ Opt-in **anonymous counts** (off by default; weekly screen-open totals, no account, no identity).
- ✅ Row-level security tests on the database run in CI. Dependency audit blocks high-severity issues.
- ⚙️ Sign-in bot check (Turnstile): works in automated browsers; **never tested on a real phone**.

## Getting started and accounts
- ✅ Setup flow (name, passphrase, recovery code, 13+ and terms confirmation, language). Quick tour. **"Explore with a sample circle"** (fictional data; passphrase `sample circle`).
- ✅ Sign in with an **email code** (no passwords). **"I already use iDID"** restores a journal on a new device.
- ✅ Installable to the home screen; works offline; calm error page.

## Logging and the journal
- ✅ **Quick log**, 5 optional steps with "Save now" any time: when (with "best guess"), where, triggers/possible cause, mood/feelings/intensity, fronting/co-fronting parts or unknown fronter, lost time, duration, who noticed, notes, circle or "only me".
- ✅ **Parts / system**: pronouns, age, role, notes, color; your own word (parts, alters, headmates, selves).
- ✅ **Timeline** with search and filters; entry detail.
- ✅ **Patterns / Insights**: mood trend, triggers, fronting, triggers per part, places, day × time heatmap, what helps.
- ✅ **Who's here**: two-tap fronting log (co-fronting, "not sure", blurry), history and patterns; inner-board notes appear when the part they're for arrives.
- ✅ **What did I miss?**: after lost time, grounding with today's date, then everything noted during the gap plus what's coming up.
- ✅ **Voice notes**: up to 2 minutes, stored encrypted, always private.
- ✅ **Weekly reflection** (opt-in, weekend, three optional questions, never scored).
- ✅ **Observe**: ask someone who noticed to add their observation *(screen exists; details unsure)*.

## Calm, safety and tools for hard days
- ✅ **Pause**: breathing, **box breathing** (builds a group of boxes), 5-4-3-2-1 grounding, "right now" orientation, crisis lines (988, 911, Crisis Text Line in the footer/English).
- ✅ **Calm space** (wordless ripples, light trails, drifting lights).
- ✅ **Safety plan** (guided; private unless shared with the circle).
- ✅ **Check on me** (quietly ask people to reach out), **comfort kit**, **inner board** (notes between parts), **body basics** with medication reminders, **therapy prep**.
- ✅ **Gentle check-ins** at random times (never in quiet hours): "How are you doing right now?", then breathe, a personal healthy ritual, or fresh air; "Struggling" leads to grounding, contacts and 988. Patterns show what helps.
- ✅ **Mood Garden**: a plant per part/person grown only by care, never wilts; weather from check-ins, seasons, ideas to help it grow.
- ✅ **Supporting someone** guide for partners, family, friends. **Kindness**: daily act, and anonymous **kind notes** (opt-in, curated messages, no DMs, fully anonymous both ways).
- ✅ **Explore and badges** (gentle milestones, no streaks, no comparison, at most one weekly suggestion).

## Trust circle and sharing
- ✅ **Online circle**: each person on their own phone, one-time invite links (key in the `#` part, never sent to servers), statuses Waiting/Joined/Expired with Remind, New link, Cancel (only the maker or owner).
- ✅ **Roles** set by the owner: can view and add, view only (server-enforced), or only selected information. Remove people; **hand the circle over** to the person it's about.
- ✅ **Therapist / care-team view**: read-only, end-to-end encrypted link, chosen categories and dates, explicit consent, last-viewed status, end date, remove access. No account needed to view.
- ✅ **Clinician summary** (print/PDF), **CSV export** (formula-safe), full **backup and restore**.
- ✅ **Appointments**: repeating schedules, reminders, "since last session" summary, add to Apple/Outlook/Google Calendar (neutral title by default).
- ⚙️ **Push notifications** (appointment reminders, daily check-ins, circle requests; text always generic). Needs the push keys and a once-a-minute database job from `docs/SETUP.md`; **I can't tell from the notes whether they are switched on live** *(unsure)*. iPhone only after "Add to Home Screen" (iOS 16.4+).

## Help, support and community
- ✅ **Help**: about 36 searchable in-app guides; **What's new** from the changelog.
- ✅ **Find support**: ZIP + needs (DID specialist, trauma, low-cost, LGBTQ+, veterans, family…) → crisis lines, specialists, health centers, helplines, learning. Nothing looked up automatically; ZIP only sent when a link is tapped. Saved support contacts, one tap from Pause.
- ✅ **Suggest a feature** (goes to the team; they reply and track status in Manage requests). **Help shape iDID** volunteer form (not encrypted; says so).
- ✅ **Support iDID** via Ko-fi (ko-fi.com/ididcare, public supporter list off). Never unlocks anything.

## Comfort and languages
- ✅ Themes: Morning, Meadow, Dusk (dark), High contrast. 4 text sizes, calm motion, readable font. No sounds, vibration or flashing.
- ✅ **English** and **Español (beta)**: setup, lock, sign-in, Home, Pause, safety plan, What did I miss?, Spanish crisis options (988 press 2, text AYUDA). Other app screens fall back to English.
- 🧪 Spanish has **no native-speaker review yet** (review email to be redrafted once a reviewer is named).
- Not yet in Spanish: Timeline, Log, Patterns, Circle, Settings, Help, Explore, Garden, Who's here, voice notes, inner board, appointments, website, privacy/terms, push notifications and emails.

## Website (idid.care)
- ✅ Home, Learn, Privacy, Terms, Spread the word (flyer, QR, social images), Press kit + fact sheet + press release, Clinicians page, 404, offline page. Strict CSP/headers, `security.txt`, real sitemap dates, accessibility audit (0 issues, light and dark) in CI.
- ✅ Status console/health checks are handled outside this repo (weDID family) *(unsure of details)*.

## Hard limits and known leftovers
- Circle members can read anything shared with the circle; use "Only me". Removing someone can't take back what they already downloaded. A circle member could vandalize shared records (use view-only).
- Anyone holding a shared-view link can open it. Calendar and CSV exports leave the encryption.
- A writing member could pre-create a notification tag to hide one alert (low risk, left as is).
- Supabase advisor: 21 expected warnings, 0 errors.
- Two merged branches still on GitHub (`claude/contrast-fixes`, `claude/jolly-mendel-ftx8mb`).
- Not tested: real phones, VoiceOver, the invite buttons with two real accounts, exported CSV in Excel/Sheets, Turnstile on a real phone.

## Parked or not built
- **Android / iOS store apps** (Capacitor, on-device notifications, Face ID / fingerprint): roadmap item 3, not started.
- **Spanish phase 2** (rest of the app + website): on hold.
- **Supabase backups** (Pro plan or weekly `pg_dump`): on hold, owner's choice.
- **Lawyer review** of privacy, terms and incident plan: on hold; needed before a public launch.
- **Advisory groups** (clinical advisors + lived-experience council): plan in `docs/ADVISORY_GROUP.md`, outreach waiting on Rob.
- Faster row-level security at scale: later. Version 1.0.0 not yet declared ("still being tested with real users").
- Deliberately not built: ads, analytics beyond opt-in counts, AI chat, streaks/scores, direct messages, sounds/vibration.

**Keep this current: update at every release** (and add any new feature to `docs/features.json` too).
