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

## Status and roadmap (updated 13 November 2026)

- **Live:** v0.18.0 at app.idid.care and idid.care. Recent: Spanish beta (core screens), circle key rotation after removing someone, Help shape iDID volunteer form, opt-in anonymous counts, terms and health-data privacy policy, sign-in CAPTCHA.
- **`main` is protected:** every change goes through a PR with the `app`, `site` and `database` checks green. The owner says "merge" for each PR. Work on a branch, open a draft PR, reset the branch to `origin/main` after it merges.
- **Next (waiting on the owner):** Ko-fi page link, to be added as "Support iDID" in Settings and the site footer, with Ko-fi on the privacy page's provider list (its public supporter list should be off). Native-speaker review of `app/src/i18n/es.ts` (see `docs/I18N.md`). Advisory group outreach (volunteer for now; see `docs/ADVISORY_GROUP.md`).
- **On hold by the owner's choice:** Spanish phase 2 (remaining screens and website), Supabase backups, lawyer review.
- **To check:** DNSSEC for idid.care still showed "pending" on 14 November (the domain was registered 12 November). If still pending after 18 November, turn DNSSEC off and on in Cloudflare (idid.care → DNS → Settings).
- **Not yet tested on a real phone:** the Turnstile sign-in check (tested only in automated browsers).
- **Gotchas:** CI uses Node 24 and npm 11. Regenerate `app/package-lock.json` with that npm, or `npm ci` fails in CI. Live DB migrations are applied through the Supabase Management API after the owner OKs them; also insert the version into `supabase_migrations.schema_migrations`. Only "only me" records are left untouched by key rotation, because record ids come from the circle's first key (kept in the keyring).

## How the owner likes to work

Plain language, recommendations rather than option lists, outcome first, then what was and wasn't tested. Do work end to end without asking, but ask before applying live database migrations, and wait for "merge" on each PR.
