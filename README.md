# iDID — a gentle journal

**Current version: 0.15.0** · [What's changed](CHANGELOG.md) · [How versions work](docs/RELEASING.md)

iDID is a calm, private app for documenting dissociative and trauma-related experiences (with DID in mind). It's built for one person, a family, or a small **trust circle**. In a few taps you can record that something felt different: when and where it happened, possible triggers, mood, which parts were fronting or co-fronting, lost time, how long it lasted, and who noticed. People in the circle who noticed get a gentle prompt to add their own observations.

The app lives in [`app/`](app/). It's a React + TypeScript **Progressive Web App**: it works in any browser, can be installed to a phone's home screen, and works offline.

## Features

| Area | What it does |
|---|---|
| **Welcome & check-ins** | Greets each person by name, notices time away, and asks reflective follow-ups about recent moments. |
| **Quick log** (5 optional steps, "Save now" anytime) | When (with a "best guess" flag) · Where · Triggers & possible cause · Mood, feelings, intensity · Fronting / co-fronting parts, unknown fronter · Lost time · Duration · Who noticed · Notes · Circle or "only me" |
| **Trust circle** | People with roles and permissions. Ask anyone who noticed something to add their observation. |
| **Online circle** | Each person on their own phone: sign in with an email code, invite with a one-time link, automatic end-to-end encrypted sync. Invitations show **Waiting / Joined / Expired** with **Remind**, **New link** and **Cancel**. **I already use iDID** restores a journal on a new device. Joining after starting alone merges your profile into the one made for you. |
| **Who can see what** | The circle's owner sets each person's access: **can view and add**, **view only** (enforced by the server), or **only selected information** (a separate read-only view). Remove access any time, or **hand the circle** to the person it's about. |
| **Therapist & care team** | A scoped, read-only, end-to-end encrypted view for a therapist or anyone chosen, created only after explicit consent, always current, with last-viewed status, an optional end date, and **remove access**. No account needed to view. |
| **Appointments** | Therapy, counseling, support groups, psychiatry: repeating schedules, reminders, "since last session" summaries, **add to Apple, Outlook or Google Calendar**. |
| **Alerts** | Push notifications for appointment reminders, daily check-ins, and requests from the circle. The text is always generic so nothing private shows on a lock screen. |
| **Gentle check-ins** | At random times (never in quiet hours) iDID asks whoever is here "How are you doing right now?", answers with a kind, honest word, and offers something small: breathe together, interrupt the pattern with one of your own healthy rituals, or get some fresh air and sunshine (suited to the time of day). "Struggling" leads to grounding, your contacts and 988. Patterns shows what actually helps. |
| **Tools for hard days** | A wordless **Calm space** (ripples, light trails, drifting lights), a guided **safety plan**, **Check on me** (quietly ask people to reach out), **Quick hide**, a **comfort kit**, an **inner board** for notes between parts, **body basics** with medication reminders, and **therapy prep**. |
| **Explore & badges** | A quick tour, every feature in one place with what you've tried, gentle milestone badges (no streaks, no comparison), and at most a weekly suggestion of something that might help. |
| **Kindness** | A daily small act of kindness to pay it forward, and anonymous **kind notes**: pick a caring message to brighten a random person's day. Opt-in, curated, no direct messages. |
| **Help & guides** | 29 searchable in-app guides with steps and shortcuts, plus **What's new** after every update. Works offline, with a calm error page if something breaks. |
| **Suggest a feature** | Ideas and requests go to the iDID team, who can reply and track status in an in-app **Manage requests** screen. |
| **Find support** | ZIP code and needs (DID specialist, trauma, low-cost care, LGBTQ+, veterans, family…) drive matched crisis lines, nearby specialists and health centers, helplines, and learning and community resources. Personal support contacts (therapist, social worker, crisis center) are one tap away on the Pause screen. |
| **Parts / system** | Parts with pronouns, age, role, notes and color. Your choice of word (parts / alters / headmates / selves). |
| **Timeline & Patterns** | Search and filters; mood trend, triggers, fronting, triggers per part, places, day × time heatmap. |
| **Share & export** | Clinician summary (print/PDF), CSV, full backup and restore. |
| **Mood Garden** | One plant per part (or per person, including family members), grown only by care: moments, check-ins, pauses, box breathing, kind notes. Choose plant types and names; optional weather from check-ins (wind and storms on hard days, plants keep growing); seasons or always spring; gentle "ways to help it grow" ideas linked to the rest of the app, and a tally of what you've already done. |
| **Who's here** | Two-tap fronting log (co-fronting, "not sure", blurry), front history, patterns (time in front, usual times, common hand-overs) and inner-board notes surfaced when the part they're for arrives. Always private. |
| **What did I miss?** | After lost time: grounding with today's date, then everything noted in iDID during the gap (fronts, moments, board and voice notes, circle notes, check-ins, appointments) and what's coming up. |
| **Voice notes** | Up to 2 minutes, recorded in the browser and stored inside an encrypted record. Always private. |
| **Weekly reflection** | Optional weekend look-back: a gentle summary and three questions. Never scored; skippable. |
| **Supporting someone** | Guide for partners, family and friends with words to try, things to do and to avoid. |
| **Pause** | Breathing, **box breathing** (build a group of boxes), 5-4-3-2-1 grounding, "right now" orientation, crisis lines. |
| **Sensory comfort** | Morning, Meadow, Dusk (dark) and High contrast themes; 4 text sizes; calm motion; readable font. No sounds, vibration or flashing. |
| **Privacy** | Encrypted on the device with your passphrase (AES-256-GCM) and a recovery code; auto-lock; end-to-end encrypted sync. See [docs/SECURITY.md](docs/SECURITY.md). |

## Running it

```bash
cd app
npm install
npm run dev            # local development at http://localhost:5173
npm run build          # production PWA in app/dist/ (host on any static host)
npm run build:single   # one self-contained HTML file in app/dist-single/
npm test               # unit tests: encryption, sync, scheduling
../supabase/tests/run.sh  # database row-level security tests (needs PostgreSQL)
```

The first screen has **"Explore with a sample circle"**, which loads fictional data so you can try every feature. The sample's passphrase is `sample circle`.

## Architecture

- **App:** React + TypeScript PWA in `app/` (installable, works offline).
- **On-device data:** an in-memory store backed by per-record AES-GCM ciphertext in IndexedDB (`app/src/data/`).
- **Online circle:** Supabase (Postgres + auth + realtime) stores only ciphertext. Schema and row-level security are in `supabase/migrations/`, the push sender in `supabase/functions/send-push/`, and the sync engine in `app/src/sync/`.
- **Website:** `site/`, a fast static site for [idid.care](https://idid.care) (about, Learn, privacy, Spread the word, press kit), with generated social images, icons, QR code and printable flyer (`site/tools/`).
- **Hosting:** Cloudflare Pages, with the website at **idid.care** and the app at **app.idid.care**, deployed by `.github/workflows/deploy.yml` (see [docs/DEPLOY.md](docs/DEPLOY.md)). CI runs type checks, unit tests, the build, website checks, and database security tests on every pull request.

**Go live:** [docs/DEPLOY.md](docs/DEPLOY.md) · **Setup guide:** [docs/SETUP.md](docs/SETUP.md) · **Security model:** [docs/SECURITY.md](docs/SECURITY.md) · **Changelog:** [CHANGELOG.md](CHANGELOG.md) · **Releasing:** [docs/RELEASING.md](docs/RELEASING.md)

## Roadmap

1. ✅ Free web app with on-device encryption
2. ✅ Online circle with end-to-end encryption, invites, push alerts, appointments and calendar export
3. ⏭️ Android (Google Play) and iOS (App Store) apps via Capacitor, with on-device notifications and Face ID / fingerprint unlock
4. ✅ Per-person access, therapist & care-team sharing, handing over a circle, restore on a new device
5. Later: rotate the circle key when someone leaves

> iDID is a journaling tool, not a medical device, and is not a substitute for professional care.
