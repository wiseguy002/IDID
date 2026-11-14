# iDID strategy

Decisions and options for where iDID goes next. Items marked **Owner decision** need you. Everything else is either done or ready to start. Last updated 13 November 2026.

## 1. Positioning

**One line:** iDID is a gentle, private journal for dissociation, DID and trauma responses, and for the people who support them.

**What makes it different** (lead with these, in this order):

1. **Made for dissociation and plural systems.** Parts, a fronting log, an inner board, lost-time support ("What did I miss?"), and the person's own words (parts, alters, headmates or selves). General mood trackers don't do this.
2. **Private by design.** Journals are encrypted on the device, and the people who run iDID can't read them. No ads, trackers or data sales. Say "end-to-end encrypted" and "we can't read your journal". **Never say "HIPAA compliant."**
3. **Built for the circle.** Partners, family and therapists can help, with access the person controls and can take back.
4. **Trauma-informed.** Everything is optional. No streaks, scores or penalties. Gentle language throughout.

**Audiences, in priority order:**

1. Adults with DID/OSDD and dissociative symptoms.
2. Partners and family.
3. Trauma-informed therapists. They are the multiplier: one therapist can introduce many clients. See `/clinicians`.
4. Peer-support groups and nonprofits.

**Channels that fit** (no paid ads, which would contradict the no-trackers promise):

- Therapist word of mouth and the clinicians page.
- DID and dissociation communities, such as peer-run groups and creators who share their own lived experience. Ask first, and never astroturf.
- Nonprofits: ISSTD's public resources, An Infinite Mind, Beauty After Bruises.
- Press, starting with the press kit at `/press`.

## 2. Clinical advisory group

The fuller plan is in `docs/ADVISORY_GROUP.md`: two groups (clinical advisors and a lived-experience council), where to find people, honoraria, a one-page agreement, a first-meeting agenda and messages you can send.

**Owner decision:** who to invite. A starting charter:

- **Purpose:** review new features, wording and safety flows. Advise on what *not* to build. Flag harm (for example, features that could reinforce avoidance, or be used to monitor someone).
- **Members (4–6):**
  - a therapist experienced with DID (ISSTD member),
  - a trauma-focused psychiatrist,
  - a peer specialist with lived experience,
  - a family-therapy perspective,
  - ideally someone fluent in Spanish (for section 6).
- **Commitment:** a 60-minute call each quarter, plus async review of major releases (about 1 hour per month). Offer an honorarium if funding allows, and credit on the site if they want it.
- **Conflicts:** members don't receive user data. The advisory group never has access to journals, which the encryption guarantees anyway.
- **First agenda:**
  1. Review the "Who's here" patterns wording.
  2. Review the "What did I miss?" grounding text.
  3. Review the supporter scripts.
  4. Review age 13–17 guidance.
  5. Decide whether to add clinician-facing educational content.

The `/clinicians` page already invites interest (hello@idid.care, subject "Clinical advisory group").

## 3. Funding (no ads, ever)

**Status (14 November 2026):** voluntary contributions are live through Ko-fi at https://ko-fi.com/ididcare, linked from Settings → About and the website footer. Keep its public supporter list turned off. Ko-fi is on the privacy page's provider list.

Running costs today are near zero: Cloudflare free, Supabase free, Resend free (shared with your other apps). Expected costs as iDID grows:

| Item | When | Cost |
| --- | --- | --- |
| Supabase Pro (backups, no pausing) | Before more than a small test group | $25/month |
| Resend Pro (own quota, 50k emails) | When sign-ins approach 100/day | $20/month |
| Lawyer review of privacy and terms | Before public launch | $1,500–5,000 one-time |
| Apple developer account (if app stores) | Later | $99/year |
| Professional Spanish translation | Section 6 | about $0.12–0.20/word |

**Options, best fit first:**

1. **Free core and a voluntary "supporter" contribution** (pay what you can, one-time or monthly). Nothing is locked behind it. Supporters could get a thank-you badge and early previews. *Recommended.* It fits the mission and the trust promise.
   - **Owner decision:** choose a processor. Stripe Payment Links or Ko-fi are simplest, need no code at first, and keep card data off iDID entirely. Then add a "Support iDID" link in Settings and the site footer, and a short section on the privacy page (the processor sees the supporter's payment details, never journal data).
2. **Grants.** Mental-health and digital-health foundations, state behavioral-health innovation funds, and trauma-focused nonprofits. iDID's privacy design and free access are strong points. A fiscal sponsor (for example, a local community foundation) lets you accept grants before forming a nonprofit.
3. **Clinician or organization tier (later):** for practices or nonprofits that want onboarding help or printed materials. It must never add access to client data.

Never: ads, selling or "sharing" data, paid features that gate safety tools, or dark patterns around payment.

## 4. Opt-in anonymous feature counts

**Status: built** (migration `20261116000000_feature_counts.sql`, `app/src/lib/counts.ts`). The server keeps only weekly totals per feature, not individual submissions. Admins see them on the Manage requests screen.

**Goal:** learn which features help (for example "how many people used What did I miss? this week") without learning anything about anyone.

**Design:**

- Off by default. A Settings switch reads: "Share anonymous counts of which features are used. Never what you write, never who you are."
- The app keeps a weekly tally on the device, such as `{ week: '2026-W46', counts: { missed: 2, front: 5 } }`. Once a week it sends that one row, with no user ID, no circle ID and no device ID, to an insert-only table (`feature_counts(week text, counts jsonb, app_version text)`).
- Row-level security: `insert` only for the anon role, with no `select` for anyone except the service role. Nothing links a row to an account.
- The counts only use names from the Explore feature list, so free text can never be sent.
- Privacy page: add a paragraph under "Your choices", and update the provider and "what our servers can see" lists.
- **Washington MHMDA note:** even anonymous usage of a mental-health app may count as consumer health data if it could be linked to a person. Not storing IP addresses or IDs keeps it de-identified, but confirm this in the lawyer review.

**To do it:** say "build the anonymous counts". That adds the migration, RLS tests, the client code and the privacy changes in one PR, and asks before applying the migration live.

## 5. App stores

Deferred, at your request. The PWA works on all phones today.

## 6. Spanish

**Status: phase 1 built.** It covers the translation layer, the language picker and the core screens; see `docs/I18N.md` for coverage and the glossary. Next: native-speaker review, then the remaining screens and the website.

- **Scope:** about 40 screens, 34 help guides, the tour, the supporter guide, the Learn and clinicians pages, and the privacy policy and terms. That's roughly 25,000 words of user-facing text.
- **Approach:**
  1. Move app strings into a small `t('key')` catalog. No heavy library is needed, and it keeps the bundle small.
  2. Add `es` alongside `en`, with a language picker in Settings that defaults from the browser.
  3. Translate the website to `/es/` with `hreflang` tags.
- **Quality:** machine translation first, then review by a native Spanish-speaking clinician or peer specialist. Clinical terms (dissociation, alters/partes) and the crisis lines (988 has Spanish support, "Oprime 2") need care. The privacy policy and terms need a professional translation.
- **Owner decision:** whether to start, and who reviews. Begin with the app's core flow (setup, log, Pause, safety plan, What did I miss?) and the crisis information, then the rest.

## 7. Next features worth considering

These are ideas, not commitments:

- ~~Circle key rotation after removing someone~~ (built in 0.18.0; see SECURITY.md).
- Printable "about me" card for emergencies, such as "I may dissociate; here's how to help".
- Gentle trigger forecasts on Patterns, such as "Sunday evenings have often been hard".
- Shared-view support for voice notes, only if a client explicitly chooses it.
