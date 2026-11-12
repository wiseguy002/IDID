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
