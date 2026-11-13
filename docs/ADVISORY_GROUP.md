# Advisory group: ideas and plan

A small group of people who keep iDID safe, accurate and useful. This page is a starting plan: who to invite, where to find them, what to ask, and a message you can send. **Everything here is a suggestion; you decide who to invite and how formal to make it.**

## Why have one

- **Safety:** someone with clinical experience reviews crisis wording, the safety plan and anything that could make things worse for people (for example, tracking that turns into rumination, or features someone could use to monitor a partner).
- **Credibility:** therapists are more willing to suggest iDID when they can see who reviewed it.
- **Lived experience:** people who live with DID and dissociation know what helps and what feels patronizing, better than any clinician or developer.
- **Spanish:** a native-speaking reviewer for `app/src/i18n/es.ts` (see `docs/I18N.md`).

## Two circles, not one

Many mental-health tools work best with two small groups that meet separately, so neither dominates the other:

| Group | Size | Who | What they do |
| --- | --- | --- | --- |
| **Clinical advisors** | 3–5 | Therapists experienced with dissociation and complex trauma (ideally ISSTD members), a psychiatrist, a family or couples therapist, a bilingual Spanish-speaking clinician | Safety review, wording, what not to build, guidance for teens 13–17 |
| **Lived-experience council** | 4–8 | Adults with DID/OSDD or dissociative symptoms, partners and family members, a peer support specialist | Try new features early, say what feels right or wrong, choose priorities |

Keep membership private by default. Only list names on the site with each person's written OK. Never ask either group for user data. iDID's encryption means there's none to share anyway.

## Where to find people

Clinical advisors:
- The **ISSTD** (International Society for the Study of Trauma and Dissociation): its clinician directory, and members who teach or write about dissociation.
- Trauma programs at universities and teaching hospitals near you. Clinicians who supervise trainees often like advisory work.
- **National Latinx Psychological Association** members, or bilingual clinicians in your area, for the Spanish-speaking seat.
- Therapists you or people you know already trust. A warm introduction works far better than a cold email.

Lived experience:
- Peer-run organizations and communities for people with DID and dissociation. Contact the organizers first and ask how they'd like to be approached. Don't recruit in members' spaces without permission.
- **NAMI** affiliates and state certified-peer-specialist programs, for a peer specialist seat.
- People already using iDID: add an optional "I'd like to help shape iDID" link in the app's Suggest a feature screen. It would arrive like a feature request, so it isn't end-to-end encrypted, and the screen must say so.

## Commitment and thanks

- **Clinical advisors:** a 60-minute call each quarter, plus reviewing a short document or a feature preview about once a month (1–2 hours). Usual honoraria are around $100–200 per hour or a flat amount per meeting. If funds are tight, be upfront, and offer credit on `/clinicians` (with permission) and a letter they can use for their CV.
- **Lived-experience council:** a 45-minute call every two months, or written feedback, whichever each person prefers. Pay people for their time: gift cards or payment for each session. It's respectful and expected in lived-experience work. Let people take part without cameras, under a first name or pseudonym, and drop in or out without explanation.
- Everyone signs a short agreement covering confidentiality of unreleased features, no conflicts (for example, building a competing product), and that advice isn't a clinical relationship with any user.

## Agreement (one page)

1. The group gives advice. The owner makes the decisions and explains them back to the group.
2. Members review features and wording, never user data. iDID can't read journals.
3. Unreleased features and discussions stay private until they're released.
4. Members declare conflicts of interest and can step away from any topic.
5. Members may leave at any time. Their past contributions stay credited only if they want them to.
6. Being an advisor isn't an endorsement unless the member says so publicly.

## First meeting agenda (60 minutes)

1. Welcome, introductions and the one-page agreement (10 min).
2. A tour of iDID with the sample circle (10 min).
3. Review the crisis and safety wording: Pause, the crisis card, the safety plan and "What did I miss?" (15 min).
4. Review "Who's here" patterns and the supporter scripts: anything that could harm, shame or be misused (15 min).
5. Priorities: what should iDID build next, and what should it never build? (10 min)

Send screenshots and the `/clinicians` page a week ahead.

## Message you can send (clinical advisor)

> **Subject:** Would you advise a free, private journal for people with dissociation?
>
> Hi [name],
>
> I'm building iDID (idid.care), a free, end-to-end encrypted journal for people living with dissociation, DID and trauma responses, and the people who support them. It helps people notice what happens and what helps, prepare for therapy, and share a read-only view with their therapist only if they choose. We can't read anyone's journal, and there are no ads or data sales.
>
> I'm forming a small clinical advisory group to review safety and crisis wording, and to tell us what not to build. It's about one hour a quarter plus occasional short reviews. [I can offer an honorarium of $___ / I can't offer payment yet, but would gladly credit you and write a letter for your CV.]
>
> Would you be open to a 20-minute call? There's an overview for clinicians at idid.care/clinicians.
>
> Thank you,
> [your name]

## Message you can send (lived-experience council)

> **Subject:** Help shape iDID: paid, flexible, private
>
> Hi [name],
>
> iDID is a free, private journal for people living with dissociation and DID, and the people close to them. We'd like a few people with lived experience to try new features early and tell us honestly what helps and what doesn't.
>
> It's a short call every couple of months, or written feedback if you prefer. You can use a first name or a pseudonym, keep your camera off, and stop any time. We pay [$___] for each session. We'll never ask about your own journal, and we couldn't read it anyway.
>
> If you're interested, just reply and I'll send more details.

## Ideas to consider later

- A **teen safety review** before promoting iDID to 13–17-year-olds, with an adolescent-specialist clinician.
- **Release notes for clinicians:** a short quarterly email summarizing what changed, reviewed by the clinical advisors.
- A **"reviewed by" note** on the clinicians page, once advisors agree to be named.
- A **research partnership** only if the design keeps everything opt-in, consented and anonymous. Never by weakening encryption.

## Owner to-dos

1. Decide on honoraria (even a small amount helps) and fill it into the messages above.
2. Pick 3 clinicians and 2–3 peer organizations to contact first.
3. Set up a private shared folder for agendas and the agreement.
4. When someone says yes, ask Claude to add the opt-in "help shape iDID" link and, with permission, a "reviewed by" note on the clinicians page.
