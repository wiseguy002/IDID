# Working on iDID

iDID is a private, end-to-end encrypted journal for dissociation, DID and trauma responses: a React + TypeScript PWA in `app/`, a static website in `site/`, and a Supabase backend in `supabase/`. Read `README.md` for the layout and `docs/SECURITY.md` before touching anything that stores, syncs or shares data.

## Checks to run before pushing

- App: `cd app && npx tsc -b && npm test && npm run build`. Use `tsc -b`: the root `tsconfig.json` only has references, so `tsc -p .` checks nothing.
- Database: `supabase/tests/run.sh` (row-level security tests on a local Postgres).
- Website: `cd site && npm run build && npm run check`. Needs Playwright, axe-core and html-validate; it serves pages with the real CSP and runs an accessibility audit in light and dark.
- Collateral: `node scripts/check-collateral.mjs`.

## Every user-facing change

- Add a plain-language line under `## [Unreleased]` in `CHANGELOG.md` (see `docs/RELEASING.md`).
- New feature: register it in `docs/features.json` and describe it in each material in its `requiredIn` (in-app help, fact sheet, and usually the home page, press release and README; privacy page and security doc for anything about data). CI fails otherwise.

## Standard procedure: collateral audit

After enough changes that help, website, press materials or docs may be out of date, do a full collateral audit following **`docs/COLLATERAL.md`**. It's due after any minor or major release with new features, after three patch releases, after any privacy, sharing or access change, after renames, and before press or outreach. `npm run release` prints a reminder when one is due. Log each audit in the table at the end of `docs/COLLATERAL.md`.

## Conventions

- Inline `style` attributes are fine in `site/pages`: the build moves them into classes because the CSP blocks inline styles.
- Live database changes are migrations in `supabase/migrations/`, applied in filename order. Ask the owner before applying them to the live project.
- Write user-facing text in plain, gentle language and American English (color, organization, counselor, canceled). Never put private details in notifications.

## Status and roadmap (updated 14 November 2026)

- **Live:** v0.18.1 at app.idid.care and idid.care. Support iDID via Ko-fi (ko-fi.com/ididcare, public supporter list off) is linked from Settings and the site footer. Recent: Spanish beta (core screens), circle key rotation after removing someone, Help shape iDID volunteer form, opt-in anonymous counts, terms and health-data privacy policy, sign-in CAPTCHA.
- **`main` is protected:** every change goes through a PR with the `app`, `site` and `database` checks green. The owner says "merge" for each PR. Work on a branch, open a draft PR, reset the branch to `origin/main` after it merges.
- **Waiting on the owner (PR #29, key-change fixes from a code review):** OK to apply migration `20261120000000_circle_key_rotation_atomic.sql` to the live database, which must happen **before** the PR deploys (the app calls the new 3-argument `rotate_circle_key`). Then "merge". The other review findings are all fixed in that PR.
- **Next (waiting on the owner):** Native-speaker review of `app/src/i18n/es.ts`: send `docs/i18n-review-es.csv` (see `docs/I18N.md`). Advisory group outreach (volunteer for now; see `docs/ADVISORY_GROUP.md`).
- **On hold by the owner's choice:** Spanish phase 2 (remaining screens and website), Supabase backups, lawyer review.
- **To check:** DNSSEC for idid.care was re-triggered on 14 November and is still "pending" (the domain's registry add period ends 17 November). Check-ins are scheduled for 14 and 17 November. If it's still stuck after a second re-toggle, ask the owner to contact Cloudflare support with the DS record.
- **RLS policies** call `(select auth.uid())`, never bare `auth.uid()` (faster at scale); an RLS test enforces it for new policies. `pg_net` sits in the public schema (installed by Supabase; leave unless Supabase recommends moving it).
- **Not yet tested on a real phone:** the Turnstile sign-in check (tested only in automated browsers).
- **Gotchas:** CI uses Node 24 and npm 11. Regenerate `app/package-lock.json` with that npm, or `npm ci` fails in CI. Live DB migrations are applied through the Supabase Management API after the owner OKs them; also insert the version into `supabase_migrations.schema_migrations`. Only "only me" records are left untouched by key rotation, because record ids come from the circle's first key (kept in the keyring). The keyring is written only by `rotate_circle_key`, in the same transaction as the new sealed keys. In Claude's sandbox: switching branches in `/Users/robwise/IDID` is blocked (it can't write `.claude/settings.json`), so work in a `git worktree` instead; `gh` needs the sandbox off (certificate check); `npm ci` needs `--cache "$TMPDIR/npm-cache"`.

## How the owner likes to work

Plain language, recommendations rather than option lists, outcome first, then what was and wasn't tested. Do work end to end without asking, but ask before applying live database migrations, and wait for "merge" on each PR.

**Always end with a next step.** Never tell the owner there's "nothing to do" or "nothing needed in the meantime." Every reply that finishes a piece of work ends with a recommended next step, plus what else could usefully be done next: website or content updates, security hardening, bug or health checks (live headers, `npm audit`, Supabase security and performance advisors, the site check, a collateral audit when due), or the next roadmap item. Recommend one clearly; offer a few alternatives only if they're genuinely useful.
