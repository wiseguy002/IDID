# IDID — a gentle journal

IDID is a calm, private app for documenting dissociative and trauma-related experiences (with DID in mind). It's built for one person, a family, or a small **trust circle**. In a few taps you can record that something felt different: when and where it happened, possible triggers, mood, which parts were fronting or co-fronting, lost time, how long it lasted, and who noticed. People in the circle who noticed get a gentle prompt to add their own observations.

The app lives in [`app/`](app/). It's a React + TypeScript **Progressive Web App**: it works in any browser, can be installed to a phone's home screen, and works offline.

## Features

| Area | What it does |
|---|---|
| **Welcome & check-ins** | Greets each person by name, notices time away, and asks reflective follow-ups about recent moments. |
| **Quick log** (5 optional steps, "Save now" anytime) | When (with a "best guess" flag) · Where · Triggers & possible cause · Mood, feelings, intensity · Fronting / co-fronting parts, unknown fronter · Lost time · Duration · Who noticed · Notes · Circle or "only me" |
| **Trust circle** | People with roles and permissions. Ask anyone who noticed something to add their observation. |
| **Online circle** | Each person on their own phone: sign in with an email code, invite with a one-time link, automatic end-to-end encrypted sync. |
| **Appointments** | Therapy, counselling, support groups, psychiatry: repeating schedules, reminders, "since last session" summaries, **add to Apple, Outlook or Google Calendar**. |
| **Alerts** | Push notifications for appointment reminders, daily check-ins, and requests from the circle. The text is always generic so nothing private shows on a lock screen. |
| **Parts / system** | Parts with pronouns, age, role, notes and colour. Your choice of word (parts / alters / headmates / selves). |
| **Timeline & Patterns** | Search and filters; mood trend, triggers, fronting, triggers per part, places, day × time heatmap. |
| **Share & export** | Clinician summary (print/PDF), CSV, full backup and restore. |
| **Pause** | Breathing, 5-4-3-2-1 grounding, "right now" orientation, crisis lines. |
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
- **Hosting:** GitHub Pages via `.github/workflows/deploy.yml` (free). CI runs type checks, unit tests, the build, and database security tests on every pull request.

**Setup guide:** [docs/SETUP.md](docs/SETUP.md) · **Security model:** [docs/SECURITY.md](docs/SECURITY.md)

## Roadmap

1. ✅ Free web app with on-device encryption
2. ✅ Online circle with end-to-end encryption, invites, push alerts, appointments and calendar export
3. ⏭️ Android (Google Play) and iOS (App Store) apps via Capacitor, with on-device notifications and Face ID / fingerprint unlock
4. Later: rotate the circle key when someone leaves; read-only clinician access

> IDID is a journaling tool, not a medical device, and is not a substitute for professional care.
