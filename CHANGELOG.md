# Changelog

All notable changes to IDID are recorded here, newest first. The app's **What's new** screen is built from this file.

The format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/), and IDID uses [Semantic Versioning](https://semver.org/spec/v2.0.0.html):

- **MAJOR** (1.0.0 → 2.0.0): a change that needs people to act, such as a data format that older versions can't read.
- **MINOR** (0.5.0 → 0.6.0): new features. Existing journals keep working.
- **PATCH** (0.6.0 → 0.6.1): fixes and small improvements only.

While the version starts with 0, IDID is in early release and still being tested with real users. Version 1.0.0 will mark the first release we recommend for everyday use.

Write each entry for the people who use IDID, in plain language. Add new changes under **Unreleased**; they move into a numbered version when it's released (see `docs/RELEASING.md`).

## [Unreleased]

## [0.7.0] - 2026-11-12

Explore, badges, kindness and your ideas.

### Added
- A **quick tour** offered after setup (and any time from Explore), with "Show me" buttons that open each feature.
- **Explore**: every feature in one place, which ones you've tried, and gentle milestone **badges**. No streaks to break and no comparisons. Badges only ever add up, and you can hide them.
- An occasional **"Something that might help"** suggestion for a feature you haven't tried yet. At most once a week, never in your first two days, and you can turn it off or say "Don't suggest this".
- **Pay it forward**: a small act of kindness to try each day, like smiling at someone or saying hi.
- **Kind notes**: send an anonymous note of encouragement to a random person using IDID. You choose from caring messages and a little picture. There are no replies or direct messages, only light. Receiving is opt-in and limited to three a day.
- **Suggest a feature**: send ideas, services and fixes to the IDID team and see their replies. Requests made while offline are sent later.
- For the IDID team: a **Manage requests** screen to review, reply to, and track every request.

### Fixed
- A check-in or update note could appear for a moment during first-time setup.

## [0.6.0] - 2026-11-12

A clear record of how IDID changes.

### Added
- A **What's new** screen (Settings → About) showing every version and what changed, built from this changelog.
- A short "Updated to version …" note on Home the first time IDID opens after an update.
- The app version and build are shown in Settings and included in backups and clinician exports.

### Changed
- Each version gets its own offline cache, so an update cleanly replaces the old app files.

## [0.5.0] - 2026-11-12

Gentle check-ins through the day.

### Added
- Random check-ins ask whoever is here "How are you doing right now?", once to four times a day, never during quiet hours.
- Each answer gets an honest, kind word and something small to try: three guided breaths, one of your own healthy rituals to interrupt the pattern, or fresh air and sunshine suited to the time of day.
- "Struggling" brings grounding tools, your saved contacts and 988 to the front.
- **Patterns** shows what helps, for example "Breathing helped 4 of 5 times".
- A list of your own healthy rituals in Settings, and **Check in with yourself** on the Pause screen.

## [0.4.0] - 2026-11-12

Find support near you.

### Added
- A support profile for each person: ZIP code plus what would help (DID specialist, trauma therapy, low-cost care, family support, LGBTQ+, veterans, and more).
- Matched resources: crisis lines, nearby dissociation and trauma specialists, community health centers, helplines, local groups, and trusted places to learn.
- Saved support contacts (therapist, social worker, counsellor, crisis center) with call, text, email and map, and the option to pin them to the Pause screen.
- An optional support step during setup.

## [0.3.0] - 2026-11-12

Share a circle across devices, plus appointments and alerts.

### Added
- **Online circle**: sign in with an email code, invite people with a one-time link, and sync automatically between everyone's devices.
- **Appointments** for therapy, counselling, support groups and more, with repeating schedules, reminders and a "since last session" summary.
- **Add to calendar** for Apple, Outlook and Google calendars, with a neutral title by default.
- **Notifications** for appointments, a daily check-in, and requests from your circle. The wording never reveals anything private.
- Free hosting on GitHub Pages, plus setup and security guides.

### Security
- End-to-end encryption: the server stores only data it can't read, and "only me" entries can't be read by other circle members.

### Fixed
- Pop-up panels sometimes appeared inside the page instead of on top of it.
- After locking, IDID now asks who's here again on shared devices.

## [0.2.0] - 2026-11-11

Your journal is now encrypted.

### Security
- Everything is encrypted on your device with your passphrase. A recovery code is the backup way back in.
- IDID locks itself after time in the background, and there's a **Lock now** button.

### Changed
- The 4-digit passcode is replaced by a passphrase that actually protects the data.

## [0.1.0] - 2026-11-11

The first version of IDID.

### Added
- Quick, optional 5-step log: when and where, triggers, mood and feelings, who was fronting or co-fronting, lost time, duration, and who noticed.
- A trust circle on one device, with gentle requests for observations from people who noticed.
- Parts with names, pronouns, roles and colours, using your choice of word (parts, alters, headmates or selves).
- Timeline, Patterns, a clinician summary, CSV export, and backups.
- Welcome-back messages, "looking back" reflections, and Pause tools for breathing and grounding.
- Calm themes (including dark and high contrast), text sizes, calm motion and an extra-readable font.

[Unreleased]: https://github.com/wiseguy002/IDID/compare/v0.7.0...HEAD
[0.7.0]: https://github.com/wiseguy002/IDID/compare/v0.6.0...v0.7.0
[0.6.0]: https://github.com/wiseguy002/IDID/compare/v0.5.0...v0.6.0
[0.5.0]: https://github.com/wiseguy002/IDID/compare/v0.4.0...v0.5.0
[0.4.0]: https://github.com/wiseguy002/IDID/compare/v0.3.0...v0.4.0
[0.3.0]: https://github.com/wiseguy002/IDID/compare/v0.2.0...v0.3.0
[0.2.0]: https://github.com/wiseguy002/IDID/compare/v0.1.0...v0.2.0
[0.1.0]: https://github.com/wiseguy002/IDID/releases/tag/v0.1.0
