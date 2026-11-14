# Changelog

All notable changes to iDID are recorded here, newest first. The app's **What's new** screen is built from this file.

The format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/), and iDID uses [Semantic Versioning](https://semver.org/spec/v2.0.0.html):

- **MAJOR** (1.0.0 → 2.0.0): a change that needs people to act, such as a data format that older versions can't read.
- **MINOR** (0.5.0 → 0.6.0): new features. Existing journals keep working.
- **PATCH** (0.6.0 → 0.6.1): fixes and small improvements only.

While the version starts with 0, iDID is in early release and still being tested with real users. Version 1.0.0 will mark the first release we recommend for everyday use.

Write each entry for the people who use iDID, in plain language. Add new changes under **Unreleased**; they move into a numbered version when it's released (see `docs/RELEASING.md`).

## [Unreleased]

## [0.18.0] - 2026-11-14

Safer circles after someone leaves, and a way to help shape iDID.

### Added
- When the circle's owner removes someone, iDID now also changes the circle's encryption key, so their old copy of the key can't open anything written later. Everyone still in the circle keeps everything, including "only me" entries. Unused invite links stop working, so send new ones if needed.
- **Help shape iDID**: an optional form (in Suggest a feature, or Settings) to volunteer to try new features early and tell us what helps. It's read by the iDID team, so it isn't end-to-end encrypted, and it only holds what you type in it.

## [0.17.0] - 2026-11-13

iDID in Español (beta), and easier-to-read colors.

### Added
- **Español** (beta): choose Spanish on the first screen or in Settings, or iDID starts in Spanish if your device is set to it. Setup, the lock screen, sign-in, Home, Pause, the safety plan, What did I miss? and the crisis information are translated, including the 988 Lifeline's Spanish options (call 988 and press 2, or text AYUDA to 988). Other screens are still in English for now.

### Changed
- Easier-to-read colors in the Morning, Meadow and Dusk themes: links, buttons, warnings, the current tab and softer gray text now stand out more clearly against their backgrounds. The look stays the same.

## [0.16.0] - 2026-11-13

Optional anonymous counts, and a page for clinicians.

### Added
- **Anonymous counts** (off unless you turn them on in Settings → Privacy): share how often each screen is opened, once a week and without your account, so we can learn which tools help. Never anything you write. Turning it off deletes counts not yet sent.
- A page for therapists and other clinicians at idid.care/clinicians: what clients can bring to sessions, how sharing works, and what iDID isn't.

## [0.15.0] - 2026-11-13

Knowing who's here, finding your way back after lost time, and help for the people who support you.

### Added
- **Who's here**: note which parts are around in two taps, including co-fronting, "not sure" and when things feel blurry. See your front history and gentle patterns: roughly how long each part is around, when they usually arrive, and common hand-overs. Notes left on the inner board for a part now appear as soon as that part is here.
- **What did I miss?**: for after lost time. It starts with today's date and a moment to ground, then gathers everything noted in iDID during the gap, and what's coming up next.
- **Voice notes**: record up to two minutes when typing is too much. Encrypted on your device and private to you.
- **Weekly reflection** (turn it on in Settings): on the weekend, a gentle look back at your week with three optional questions. Never scored, always skippable. Past reflections appear on Patterns.
- **Supporting someone**: a guide for partners, family and friends, with words to try and things to do when someone feels far away, has a different part around, has lost time, or is overwhelmed.
- The sample circle now includes two weeks of "who's here" notes and a note waiting for a part.

## [0.14.0] - 2026-11-13

Safer sign-in, and clear terms and privacy rights.

### Added
- Terms of use at idid.care/terms. Setup now asks you to confirm you're 13 or older and agree to the terms.
- The privacy policy now explains your rights over health information under US state laws (Washington, Nevada, Connecticut and California), lists the companies that help run iDID, and says what we'd do if something went wrong.

### Changed
- Signing in now includes a quick check that you're a person, not a bot. Most people never see it. It keeps sign-in emails flowing for everyone.
- The website home page now shows the Mood Garden, on a sunny day and in a storm.

## [0.13.2] - 2026-11-12

A way in on any device.

### Fixed
- **Signing in on a device that already has a journal**: if someone had explored the sample circle on a phone or computer, it showed a "Welcome back" lock screen that wouldn't accept your real passphrase, with no way to sign in instead. iDID now recognizes the sample and offers to bring your journal here, set up your own, or keep exploring. The lock screen also has **This isn't my journal**, which erases the journal on that device (after you type "erase") and goes straight to sign-in. While you explore the sample, Home shows a note with a way to leave it.

## [0.13.1] - 2026-11-12

American English throughout.

### Changed
- iDID now uses American English throughout the app, website and press materials: color, organization, counselor, neighbor, favorite and so on. "Shop" is now "Store" and the garden's autumn is "Fall". Moments you saved with the older wording are counted together with the new wording in Patterns, and update when you edit them.

## [0.13.0] - 2026-11-12

A garden that grows from the care you give, and never wilts.

### Added
- **Mood Garden**: a calm garden with one plant for each part (or one for you), grown by the care you give: noting moments, check-ins, pauses, box breathing, the Calm space, kind notes and more. Pick plant types and names that fit each part. Family members have a garden of their own. Weather follows your recent check-ins, so hard days bring wind and rain, but plants bend and keep growing and nothing ever wilts. Choose seasons through the year or always spring. "Ways to help it grow" offers a few gentle ideas that link to the rest of iDID, softer on hard days, and "Look at what you've already done" counts the care you've given. Find it under My tools on Home.
- A help guide, **Mood Garden**, and a new badge, **Gardener**.

## [0.12.1] - 2026-11-12

Everything documented, from the tour to the help guides.

### Added
- New help guides: **Find support near you**, **Explore, badges and the quick tour**, **Kindness: pay it forward and kind notes**, and **What's new, updates and working offline**.
- Explore now includes **Therapist & care team**, **Invite someone** and **Box breathing**, and there's a new **My care team** badge.

### Changed
- The quick tour mentions box breathing, the Calm space, sharing a read-only view with your therapist, choosing what each person in your circle can see, therapy prep, and Help & guides.

## [0.12.0] - 2026-11-12

Let the person at the center of the circle run it.

### Added
- **Hand the circle to someone else**: when the person whose journal it really is joins a circle a family member started, the owner can make them the circle's owner from their profile on the Circle page. They then decide who sees what, invite people, share with a care team and remove access. The previous owner stays in the circle and can still view and add. The new owner sees a one-time note with a shortcut to review who can see what.
- A help guide, **Handing the circle to someone else**.

## [0.11.0] - 2026-11-12

Share safely with your therapist and choose what each person sees.

### Added
- **Therapist & care team**: share a read-only view of your journal with a therapist, counselor, psychiatrist or anyone you choose. Tick exactly what they can see (patterns, moments, your notes, parts, what your circle noticed, check-in moods, safety plan, meds, appointments, therapy prep), how far back, and for how long. Nothing is shared until you read a plain summary and agree. They open a private link in any browser, with no account needed, and it updates as you use iDID. You can see when they last looked, change what they see (you'll agree again), edit their details, or **remove access**, which stops the link working at once.
- **Choose what each person can do**: the circle's owner can give each person **Can view and add**, **View only** (our server refuses their changes), or **Only selected information** (a private read-only view of just what you pick, instead of being in the circle). Remove someone's access any time.
- **Invitations you can follow up on**: invite a specific person from the Circle page and see each invite as **Waiting**, **Joined** or **Expired**. **Remind** sends it again by text, email or your share sheet (handy if it went to spam), **New link** replaces an expired one, and **Cancel** stops it. When they join, they're linked to the right person automatically.
- **Joining after starting on your own**: when you join someone's circle, iDID asks "Is one of these people you?" and folds everything you'd written into the profile they made for you. Nothing is lost, you don't appear twice, and "only me" entries stay private. If you had your own online circle, your journal moves across.
- **Help & guides**: step-by-step guides to everything in iDID, from logging a moment to sharing with your therapist, with search and buttons that take you straight there. Find it on Home, in Settings and in Explore.

### Fixed
- Joining a second circle could miss some of its entries on the first sync. It now reads the new circle from the beginning.
- A new device now opens the circle you joined most recently.

## [0.10.0] - 2026-11-12

Breathe in a square, and pick up where you left off on a new device.

### Added
- **I already use iDID**: on a new phone or computer, tap this on the welcome screen, sign in with your email code and your journal passphrase, and your journal comes back: your profile, parts, entries, private notes and circle, with no setup questions. This device gets its own recovery code. (Your journal needs to be in an online circle on your other device first.)
- **Box breathing** on Pause: breathe in for 4, hold for 4, out for 4 and hold for 4 while a soft light traces each side of a square. Every square you finish adds a little box to a group you're building. Choose 4 boxes (about a minute), 8 boxes (about two minutes) or keep going, and pause any time.
- With calm motion on, each side lights up in one step instead of a moving light, and new boxes appear without animation.
- Two new badges: **First box** and **Box builder** (50 boxes).

### Fixed
- Removing someone's online account no longer fails when they've saved entries, and the entries they shared stay with the circle.

## [0.9.0] - 2026-11-12

A quiet place to decompress.

### Added
- **Calm space**: a wordless, soothing space for a minute or two. Choose **Ripples** (tap and watch soft rings spread like rain on still water), **Light trails** (trace with your finger and watch the glow fade), or **Drifting** (slow floating lights you can gently nudge). Optional 1, 3 or 5 minute timer. No score, no sound, nothing to win.
- With calm motion on, ripples fade in place and drifting lights glow without moving.
- Find it on Pause, in gentle check-ins, and in My tools on Home. Patterns shows how often it helps, and there are two new badges.

## [0.8.1] - 2026-11-12

Gentler moments when things go wrong.

### Added
- If something unexpected breaks, iDID now shows a calm page ("iDID tripped over its own leaves") with **Try again** and **Reload**, and a reminder that your journal is safe, instead of a blank screen.
- A quiet note when you're offline, letting you know iDID still works and will sync when you're back.

### Fixed
- On idid.care, lists with bold text could break into one word per line.
- On idid.care, shareable messages are now shown in full on phones, and other layout issues on phones are tidied up.

## [0.8.0] - 2026-11-12

Tools for hard days: a safety plan, check on me, quick hide, and more. IDID is now **iDID**.

### Added
- **Safety plan**: seven gentle steps (warning signs, things that help, people and places, who to ask for help, professionals and crisis lines, making things safer, and what matters to you). Always one tap away on Pause, printable, and shareable with your circle if you choose.
- **Check on me**: quietly ask chosen people to check on you, call, text or come over, without explaining. They get a notification and can tap "I'm on it". You can also text saved contacts.
- **Quick hide**: tap the eye icon (or press Esc twice) to lock iDID at once and show a calm clock or a plain notepad.
- **Inner board**: a private notice board where parts can leave notes for each other, with pinning and "seen by".
- **Body basics**: sleep, meals, water, movement, daylight and medication each day; medication list with reminders; and a look at how sleep and hard moments relate.
- **Comfort kit**: photos, songs, words, scents, places, people and letters from a part who feels safe, plus "Show me something comforting".
- **Prepare for therapy**: what's happened since the last session, moments to bring up, an agenda, questions, wins, and notes to remember afterward. Printable or copied as text.
- New badges and Explore entries for all of the above.

### Changed
- The app is now called **iDID** (said "I did").
- The header fits narrow phones better.

### Security
- The inner board, body basics, medications, comfort kit, therapy prep, check-ins and Explore progress are always encrypted with your own key, so other circle members can't read them. Safety plans are private unless you choose to share them.
- Notifications for "Check on me" and medication reminders never say what they're about.

## [0.7.1] - 2026-11-12

iDID's new home at idid.care.

### Added
- **Tell a friend** in Settings, to share iDID with someone who might find it helpful.
- Links from Settings and Find support to plain-language guides at idid.care/learn.
- Proper home-screen icons for iPhone and Android.

### Security
- Strict security headers for the app (Content Security Policy, HSTS, no referrer, no framing).

## [0.7.0] - 2026-11-12

Explore, badges, kindness and your ideas.

### Added
- A **quick tour** offered after setup (and any time from Explore), with "Show me" buttons that open each feature.
- **Explore**: every feature in one place, which ones you've tried, and gentle milestone **badges**. No streaks to break and no comparisons. Badges only ever add up, and you can hide them.
- An occasional **"Something that might help"** suggestion for a feature you haven't tried yet. At most once a week, never in your first two days, and you can turn it off or say "Don't suggest this".
- **Pay it forward**: a small act of kindness to try each day, like smiling at someone or saying hi.
- **Kind notes**: send an anonymous note of encouragement to a random person using iDID. You choose from caring messages and a little picture. There are no replies or direct messages, only light. Receiving is opt-in and limited to three a day.
- **Suggest a feature**: send ideas, services and fixes to the iDID team and see their replies. Requests made while offline are sent later.
- For the iDID team: a **Manage requests** screen to review, reply to, and track every request.

### Fixed
- A check-in or update note could appear for a moment during first-time setup.

## [0.6.0] - 2026-11-12

A clear record of how iDID changes.

### Added
- A **What's new** screen (Settings → About) showing every version and what changed, built from this changelog.
- A short "Updated to version …" note on Home the first time iDID opens after an update.
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
- Saved support contacts (therapist, social worker, counselor, crisis center) with call, text, email and map, and the option to pin them to the Pause screen.
- An optional support step during setup.

## [0.3.0] - 2026-11-12

Share a circle across devices, plus appointments and alerts.

### Added
- **Online circle**: sign in with an email code, invite people with a one-time link, and sync automatically between everyone's devices.
- **Appointments** for therapy, counseling, support groups and more, with repeating schedules, reminders and a "since last session" summary.
- **Add to calendar** for Apple, Outlook and Google calendars, with a neutral title by default.
- **Notifications** for appointments, a daily check-in, and requests from your circle. The wording never reveals anything private.
- Free hosting on GitHub Pages, plus setup and security guides.

### Security
- End-to-end encryption: the server stores only data it can't read, and "only me" entries can't be read by other circle members.

### Fixed
- Pop-up panels sometimes appeared inside the page instead of on top of it.
- After locking, iDID now asks who's here again on shared devices.

## [0.2.0] - 2026-11-11

Your journal is now encrypted.

### Security
- Everything is encrypted on your device with your passphrase. A recovery code is the backup way back in.
- iDID locks itself after time in the background, and there's a **Lock now** button.

### Changed
- The 4-digit passcode is replaced by a passphrase that actually protects the data.

## [0.1.0] - 2026-11-11

The first version of iDID.

### Added
- Quick, optional 5-step log: when and where, triggers, mood and feelings, who was fronting or co-fronting, lost time, duration, and who noticed.
- A trust circle on one device, with gentle requests for observations from people who noticed.
- Parts with names, pronouns, roles and colors, using your choice of word (parts, alters, headmates or selves).
- Timeline, Patterns, a clinician summary, CSV export, and backups.
- Welcome-back messages, "looking back" reflections, and Pause tools for breathing and grounding.
- Calm themes (including dark and high contrast), text sizes, calm motion and an extra-readable font.

[Unreleased]: https://github.com/wiseguy002/IDID/compare/v0.18.0...HEAD
[0.18.0]: https://github.com/wiseguy002/IDID/compare/v0.17.0...v0.18.0
[0.17.0]: https://github.com/wiseguy002/IDID/compare/v0.16.0...v0.17.0
[0.16.0]: https://github.com/wiseguy002/IDID/compare/v0.15.0...v0.16.0
[0.15.0]: https://github.com/wiseguy002/IDID/compare/v0.14.0...v0.15.0
[0.14.0]: https://github.com/wiseguy002/IDID/compare/v0.13.2...v0.14.0
[0.13.2]: https://github.com/wiseguy002/IDID/compare/v0.13.1...v0.13.2
[0.13.1]: https://github.com/wiseguy002/IDID/compare/v0.13.0...v0.13.1
[0.13.0]: https://github.com/wiseguy002/IDID/compare/v0.12.1...v0.13.0
[0.12.1]: https://github.com/wiseguy002/IDID/compare/v0.12.0...v0.12.1
[0.12.0]: https://github.com/wiseguy002/IDID/compare/v0.11.0...v0.12.0
[0.11.0]: https://github.com/wiseguy002/IDID/compare/v0.10.0...v0.11.0
[0.10.0]: https://github.com/wiseguy002/IDID/compare/v0.9.0...v0.10.0
[0.9.0]: https://github.com/wiseguy002/IDID/compare/v0.8.1...v0.9.0
[0.8.1]: https://github.com/wiseguy002/IDID/compare/v0.8.0...v0.8.1
[0.8.0]: https://github.com/wiseguy002/IDID/compare/v0.7.1...v0.8.0
[0.7.1]: https://github.com/wiseguy002/IDID/compare/v0.7.0...v0.7.1
[0.7.0]: https://github.com/wiseguy002/IDID/compare/v0.6.0...v0.7.0
[0.6.0]: https://github.com/wiseguy002/IDID/compare/v0.5.0...v0.6.0
[0.5.0]: https://github.com/wiseguy002/IDID/compare/v0.4.0...v0.5.0
[0.4.0]: https://github.com/wiseguy002/IDID/compare/v0.3.0...v0.4.0
[0.3.0]: https://github.com/wiseguy002/IDID/compare/v0.2.0...v0.3.0
[0.2.0]: https://github.com/wiseguy002/IDID/compare/v0.1.0...v0.2.0
[0.1.0]: https://github.com/wiseguy002/IDID/releases/tag/v0.1.0
