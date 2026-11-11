# IDID — a gentle journal

IDID is a calm, private app for documenting dissociative and trauma-related experiences (with DID in mind). It's built for one person, a family, or a small **trust circle**. In a few taps you can record that something felt different: when and where it happened, possible triggers, mood, which parts were fronting or co-fronting, lost time, how long it lasted, and who noticed. People in the circle who noticed get a gentle prompt to add their own observations.

The app lives in [`app/`](app/). It's a React + TypeScript **Progressive Web App**: it works in any browser, can be installed to a phone's home screen, and works offline.

## Features

| Area | What it does |
|---|---|
| **Welcome & check-ins** | Greets you by name, says "welcome back" after time away, and asks reflective follow-ups about recent moments ("With a little distance, is there anything you'd add?"). |
| **Quick log** (5 optional steps, "Save now" at any point) | When (now / earlier, with a "best guess" flag) · Where · Triggers + possible cause · Mood (soft colour scale, no faces) · Feelings · Intensity · Fronting part(s) / unknown · Co-fronting with whom · Lost time · Duration · Who noticed (circle + others) · Notes · Privacy (circle or private) |
| **Trust circle** | People with roles (partner, family, friend, clinician…) and permissions: *tracked*, *can view*, *can be asked to add notes*. More than one person can be tracked. |
| **Observation requests** | When you mark that a circle member noticed, they get a gentle request. They answer with chips ("voice changed", "seemed younger"…), which part it seemed to be, duration, and free text. |
| **Parts / system** | Per-person list of parts with pronouns, age, role, notes, and colour. Parts can be marked "resting" without losing history. You choose the word: parts / alters / headmates / selves. |
| **Timeline** | Grouped by day, with search and filters by person and part. |
| **Patterns** | Mood over 12 weeks, top triggers, who was fronting, **triggers per part**, locations, a day × time-of-day heatmap, feelings, durations, who tends to notice. |
| **Share & export** | Printable clinician summary (save as PDF), CSV for spreadsheets (or the share sheet on phones), full JSON backup, restore/merge. |
| **Pause** | Breathing circle, 5-4-3-2-1 grounding, "right now" orientation (date, time, place), and crisis line info. |
| **Sensory comfort** | 4 themes (Morning, Meadow, Dusk dark, High contrast), 4 text sizes, calm-motion mode (honours the OS setting), extra-readable font, square or rounded edges. No sounds, vibration, flashing, or red alerts. |
| **Privacy** | All data stays on the device (IndexedDB). Optional passcode lock. Nothing leaves the device unless you export it. |

## Running it

```bash
cd app
npm install
npm run dev            # local development at http://localhost:5173
npm run build          # production PWA in app/dist/ (host on any static host)
npm run build:single   # one self-contained HTML file in app/dist-single/
```

The first screen has **"Explore with a sample circle"**, which loads fictional data so you can try every feature.

## Current architecture

- **Storage:** IndexedDB via Dexie (`app/src/db.ts`). The data model is in `app/src/types.ts`.
- **Multi-user:** for now the circle shares **one device**. A "Who's here?" picker appears when the app opens. Sharing with other devices is done through export files.
- **Hosting:** static files only, so it can be hosted free (GitHub Pages, Netlify, Cloudflare Pages).

## Decisions still open

1. **Multi-device trust circle (the biggest one).** Today, circle members must share a device.
   - **A. Supabase** (Postgres + auth + row-level security + realtime). Fastest to build; free tier; sign in by email link. *Recommended.*
   - **B. Firebase** (Firestore + Auth + push notifications). Similar to A, with good mobile push.
   - **C. Self-hosted** Node/Postgres server. Full control and data residency, but you run it.
   - **D. End-to-end encrypted sync** (on top of A or C). The server can't read entries. Best privacy, but more work, and a lost key means lost data.
2. **Notifications.** For example, nudge a circle member when they're asked for a note, or send optional daily check-in reminders. This needs option A or B.
3. **App stores.** Keep it as a PWA (installable from the browser, no store fees), or wrap it with Capacitor for the iOS/Android stores.
4. **Encryption at rest.** The passcode currently locks the screen only. The data itself could also be encrypted with a key derived from the passcode.
5. **Clinician access.** PDF/CSV export only (today), or a read-only clinician login once sync exists.
6. **Wording & prompts.** All prompts and chip lists are in `app/src/lib/defaults.ts` and `app/src/lib/util.ts`. Review by someone with lived experience or a clinician is very welcome.

> IDID is a journaling tool, not a medical device, and is not a substitute for professional care.
