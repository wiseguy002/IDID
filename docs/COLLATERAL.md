# Keeping help, website, press and docs up to date

iDID changes quickly. This procedure makes sure every feature people can use is explained in the app, shown on the website, and described accurately in press and project materials.

## Two layers

1. **Every pull request (automatic).** CI runs `node scripts/check-collateral.mjs`. It fails when:
   - a feature in [`docs/features.json`](features.json) isn't described in one of the materials it must appear in, or
   - a released changelog entry under **Added** that starts with a bold feature name (`- **Name** …`) isn't registered in `docs/features.json`.

   So a new feature can't be released without being registered and documented. Run it locally any time; add `--matrix` to see which material mentions which feature.

2. **A full collateral audit (by hand), when it's due.** The automatic check confirms each feature is *mentioned*. A full audit checks that what's said is still *right, complete and current*: wording, screenshots, the flyer, the press release, the tour.

## When a full audit is due

Do a full audit when any of these happens:

- A **minor or major release** adds user-facing features since the last audit. The release script (`npm run release`) prints a reminder when this is the case.
- **Three patch releases** since the last audit.
- A **change to privacy, security, sharing or access** (anything the privacy page, security doc or consent screens describe).
- A **rename** or a change to how something is reached (menus, buttons, screen names).
- **Before press or outreach**, such as a launch, an announcement or a partner conversation.

## The audit, step by step

1. **List what changed.** Read `CHANGELOG.md` from the last audited version (see the log below) to the current one. Note every new or changed feature, wording change, and privacy-relevant change.
2. **Register new features** in `docs/features.json`: a name, a `match` pattern that finds it in text, the changelog name(s) it ships under, and `requiredIn` (where it must be described; see below).
3. **Run the coverage matrix:** `node scripts/check-collateral.mjs --matrix`. Anything marked `MISSING` must be added; anything `·` that should be there is a candidate.
4. **Review and update every material** in the checklist below. Read them, don't just grep them: check that descriptions, counts, names and steps are still accurate.
5. **Regenerate assets** that bake in text: `cd site && npm run assets` (flyer PDF and preview, social images, QR code). Look at the flyer preview.
6. **Run every check:**
   - `cd app && npx tsc -b && npm test`
   - `cd site && npm run build && npm run check` (links, phone layout, CSP, accessibility in light and dark, valid HTML)
   - `node scripts/check-collateral.mjs`
7. **Release** as a patch (or with the feature release), with a changelog line for anything people will notice in the app (help guides, tour, Explore).
8. **Log it** in the table at the bottom of this file, with the version and what changed.

## Materials checklist

| Material | File | Must cover |
|---|---|---|
| In-app help | `app/src/lib/help.ts` | Every feature, as a guide with steps and a shortcut |
| Quick tour | `app/src/components/Tour.tsx` | The main areas, kept to about a minute |
| Explore | `app/src/lib/progress.ts` | Every feature someone can try, plus badges |
| Home page | `site/pages/index.html` | Headline features (cards), "Thoughtful details", FAQ |
| Learn | `site/pages/learn.html` | Education first; mention tools only where they help |
| Privacy | `site/pages/privacy.html` | Anything that stores, shares or shows data; what the server sees; honest limits |
| Spread the word | `site/pages/share.html` | Ready-to-send messages that describe current features |
| Press kit | `site/pages/press.html` | Short and long descriptions, key facts, colours |
| Fact sheet | `site/press/fact-sheet.html` | Every feature, briefly |
| Press release | `site/press/press-release.html` | Key features list and the description of sharing and privacy |
| Flyer and images | `site/tools/build-assets.mjs` | The five flyer points; social image text |
| Structured data | `site/tools/seo.mjs` | The app's feature list and FAQ source |
| README | `README.md` | Features table and roadmap |
| Security | `docs/SECURITY.md` | How each sharing, access and storage feature is protected; what the server sees; limits |
| Setup and deploy | `docs/SETUP.md`, `docs/DEPLOY.md` | Steps still match the product and infrastructure |

**Choosing `requiredIn`:** every user-facing feature belongs in `help` and `fact`. Add `home`, `release` and `readme` where the feature is significant enough to be named there. Add `privacy` and `security` for anything that stores, shares, shows or protects data.

## Audit log

| Version | Date | What changed |
|---|---|---|
| 0.12.1 | 2026-11-12 | First full audit (0.1.0 to 0.12.0). Press release, press kit, fact sheet and flyer updated for 0.9 to 0.12; home "Thoughtful details"; privacy server-visibility and limits; share messages; JSON-LD; 4 new help guides (28 total); Explore and tour updated; README and SECURITY.md. Feature registry and CI check added. |
| 0.13.0 | 2026-11-12 | Mood Garden: help guide (29 total), tour step, Explore feature and Gardener badge, home feature card, fact sheet, press release, JSON-LD, README. Registry entry added. No privacy or sharing change: plant choices sync inside existing encrypted part/member records. |
