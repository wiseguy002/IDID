# Versions and releases

iDID uses [Semantic Versioning](https://semver.org): **MAJOR.MINOR.PATCH**.

| Change | Bump | Example |
|---|---|---|
| Fixes and small improvements only | patch | 0.6.0 → 0.6.1 |
| New features; existing journals keep working | minor | 0.6.1 → 0.7.0 |
| A change that needs people to act (for example, a data format older versions can't read) | major | 1.4.0 → 2.0.0 |

While the major number is 0, iDID is in early release, and GitHub releases are marked as pre-releases. Version **1.0.0** marks the first release recommended for everyday use.

## One source of truth

- The version lives in `app/package.json`. The build stamps it, along with the git commit, into the app (Settings → About), backups, clinician summaries and the offline cache name.
- **`CHANGELOG.md`** (repository root) records every change, newest first. The in-app **What's new** screen and the "Updated to version …" note on Home are built from it, so they can't drift apart.
- Tests (`app/src/lib/changelog.test.ts`, run in CI on every pull request) fail if:
  - the newest changelog version doesn't match `package.json`
  - versions aren't valid or aren't in descending order
  - dates are out of order
  - a release has no summary or uses an unknown section
  - a compare link is missing

Backups have their own format number (`version` in the backup file), which changes only when the file layout changes. Backups also record the `appVersion` that made them.

## Every change

Add a plain-language line under `## [Unreleased]` in `CHANGELOG.md`, in the right section:

- `### Added`: new things people can do
- `### Changed`: something works differently
- `### Fixed`: something that was broken now works
- `### Security`: privacy or security improvements
- `### Removed` and `### Deprecated`: as needed

Write it for the people who use iDID, not for developers.

## Cutting a release

```bash
cd app
npm run release -- minor     # or patch / major
```

This bumps `package.json` and moves everything under **Unreleased** into a new dated version section, with compare links. It refuses to release when nothing is under Unreleased. Also add a one-line summary under the new version heading if there isn't one; it's shown on Home after people update.

Then:

1. Commit (`Release v0.7.0`) and merge to `main`. The deploy workflow publishes the web app.
2. Tag and push: `git tag v0.7.0 && git push origin v0.7.0`. The **Release** workflow checks that the tag matches the app version, runs the tests, and publishes a GitHub release with the notes from the changelog and a zip of the web build.
