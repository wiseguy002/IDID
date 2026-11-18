# Working on iDID

iDID is a private, end-to-end encrypted journal for dissociation, DID and trauma responses: a React + TypeScript PWA in `app/`, a static website in `site/`, and a Supabase backend in `supabase/`. Read `README.md` for the layout and `docs/SECURITY.md` before touching anything that stores, syncs or shares data.

Read `docs/capabilities.md` (what iDID can and can't do today) before suggesting features, and update it at each release.
Older status notes, the 14 November audit details and the full gotchas list are in `docs/history.md`.

## Where things are

- `app/` the PWA (version lives in `app/package.json`); `site/` the website; `supabase/` migrations and RLS tests
- `docs/` SECURITY, RELEASING, DEPLOY, COLLATERAL, I18N, ADVISORY_GROUP, `features.json`, `capabilities.md`, `history.md`
- `scripts/` collateral and Studio marker checks; `.github/workflows/` ci, deploy, preview, release
- Studio (content manager): idid.care's words are edited at https://admin.wedid.care/content. Pieces here: `studio.json`, `data-cms` markers in `site/pages`, edits arrive as `studio/<hex>` branches. Details in `docs/history.md`.

## Checks to run before pushing

- App: `cd app && npx tsc -b && npm test && npm run build`. Use `tsc -b`: the root `tsconfig.json` only has references, so `tsc -p .` checks nothing.
- Database: `supabase/tests/run.sh` (row-level security tests on a local Postgres).
- Website: `cd site && npm run build && npm run check` (needs Playwright, axe-core, html-validate).
- Collateral: `node scripts/check-collateral.mjs`.

## Every user-facing change

- Add a plain-language line under `## [Unreleased]` in `CHANGELOG.md` (see `docs/RELEASING.md`).
- New feature: register it in `docs/features.json` and describe it in each material in its `requiredIn`. CI fails otherwise.
- Collateral audit per `docs/COLLATERAL.md`: after a minor/major release with features, after three patch releases, after any privacy, sharing or access change, after renames, before press. Log it in the table at the end of that file.

## Conventions

- Inline `style` attributes are fine in `site/pages`: the build moves them into classes (CSP blocks inline styles).
- Live database migrations live in `supabase/migrations/`, applied in filename order. Ask the owner before applying them to the live project.
- User-facing text: plain, gentle, American English (color, organization, counselor, canceled). Never put private details in notifications.
- RLS policies use `(select auth.uid())`, never bare `auth.uid()`; a test enforces it.
- Use `<strong>`/`<em>`, not `<b>`/`<i>` (Studio's editor).

## Status (as of 14 November 2026)

- **Live:** v0.18.3 at app.idid.care and idid.care (security review fixes, all-or-nothing circle key change). Ko-fi support linked from Settings and the site footer.
- **`main` is protected:** every change is a PR with `app`, `site` and `database` checks green. PRs preview at `pr-<n>.idid-site.pages.dev` and `pr-<n>.idid-app.pages.dev`.
- **Open PR:** #43 docs/capabilities (the databank).
- **Supabase advisor:** 0 errors; the 21 warnings are expected (list in `docs/history.md`).

## Next

- Add the reviewer to the drafted Gmail "Would you review iDID's Spanish?" and attach `docs/i18n-review-es.csv` (see `docs/I18N.md`).
- Advisory group outreach (volunteer for now; `docs/ADVISORY_GROUP.md`).
- On hold by the owner's choice: Spanish phase 2 (remaining screens and website), Supabase backups, lawyer review.

## Waiting on Rob

- Native Spanish speaker to review `app/src/i18n/es.ts`.
- DNSSEC for idid.care: re-check 17 November (was "pending", no DS record at `.care`). If still stuck after a second re-toggle, Rob contacts Cloudflare support with the DS record.

## Known leftovers / not tested

- Not tested: Turnstile sign-in check on a real phone; real phones and VoiceOver; invite buttons with two real accounts; exported CSV in Excel/Sheets.
- A writing member could pre-create a notification tag to hide one alert (needs the alert's id; low risk). Left as is.
- Unused merged branches `claude/contrast-fixes` and `claude/jolly-mendel-ftx8mb` remain on GitHub (deleting was blocked by permissions).
- weDID family brand: never put "from weDID" on the icon, home-screen name, notifications, invites or circle/share screens; never use "not alone". Rules in `~/weDID` notes.

## How the owner likes to work

Plain language, recommendations rather than option lists, outcome first, then what was and wasn't tested. Do work end to end without asking, but ask before applying live database migrations.

**Never merge or deploy a pull request until Rob says "merge" for that specific PR in chat.** This includes notes-only and docs PRs. Passing checks are not enough, and a "merge" for one PR does not cover later ones. Open the PR, report the link, and wait.

**Always end with a next step.** Never say there's "nothing to do". End every finished piece of work with one recommended next step (a roadmap item, site/content update, security hardening, health check such as live headers, `npm audit`, Supabase advisors, or a collateral audit when due).

## Recipes and gotchas (short)

- CI uses Node 24 and npm 11: regenerate `app/package-lock.json` with that npm or `npm ci` fails in CI.
- Live DB migrations: after Rob OKs, run in the Supabase dashboard SQL editor (project `nnyoiljgxnpyuiersruz`) via Claude in Chrome, wrapped in `begin; … commit;` with an insert into `supabase_migrations.schema_migrations`. No Supabase CLI or token on this Mac. Full recipe in `docs/history.md`.
- Claude's sandbox: switching branches in `/Users/robwise/IDID` is blocked, so use a `git worktree`; `gh` needs the sandbox off; `npm ci` needs `--cache "$TMPDIR/npm-cache"`.
- Database tests on this Mac need `brew install postgresql@16` and a special command run outside the sandbox (in `docs/history.md`).
- Cloudflare zone Browser Cache TTL must stay "Respect Existing Headers".
- Release steps: `.claude/skills/ship-it/SKILL.md`. Databank reminder hook: `scripts/check-databank.sh`.

## Decisions

No dated decision lines were recorded in this file before 2026-11-17. Add new ones here, newest last, as `YYYY-MM-DD: decision`.
