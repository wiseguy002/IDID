---
name: ship-it
description: iDID release recipe. Use when Rob says "ship it", "release", or "merge": tests, audit, version + changelog + capabilities databank, PR to main, merge (GitHub Actions deploys), live checks.
---

# Ship it (iDID)

Steps only. If a step isn't covered here or in `CLAUDE.md`, `docs/RELEASING.md`, `docs/DEPLOY.md`: check with Rob.

## 1. Test (work in a branch/worktree, never straight on `main`)
- App: `cd app && npx tsc -b && npm test && npm run build`
- Database: `supabase/tests/run.sh`
- Website: `cd site && npm run build && npm run check`
- Collateral: `node scripts/check-collateral.mjs`
- Report anything that fails; don't continue past a failure.

## 2. Audit
- Syntax/type check = the `tsc -b` above.
- Run the `security-review` skill on the branch diff (secrets, injection, anything touching storage, sync or sharing; see `docs/SECURITY.md`).
- Read the diff against what was asked.
- Collateral audit if due (`docs/COLLATERAL.md`: minor/major with features, three patch releases, privacy/sharing/access change, renames, before press); log it in that file's table.

## 3. Version, changelog, databank
- Plain-language lines under `## [Unreleased]` in `CHANGELOG.md`; add a one-line summary under the new version heading.
- New feature: register in `docs/features.json` and describe in each material in `requiredIn`.
- Cut the release: `cd app && npm run release -- patch|minor|major` (version lives in `app/package.json`).
- Update `docs/capabilities.md` (the databank) in the same commit. The hook `scripts/check-databank.sh` blocks a release commit without it.
- Update `CLAUDE.md` status/next if they changed.

## 4. PR to main
- Commit `Release vX.Y.Z`, push the branch, open a PR. `main` needs the `app`, `site` and `database` checks green. Previews: `https://pr-<n>.idid-site.pages.dev` and `https://pr-<n>.idid-app.pages.dev`.
- Report the PR link and **wait**. Never merge until Rob says "merge" for that specific PR in chat (applies to docs-only PRs too).
- Live database migrations: ask Rob first (see `CLAUDE.md` for the recipe).

## 5. Merge and deploy (only on Rob's "merge")
- Merge the PR. Merging to `main` triggers the GitHub Actions workflow `Deploy to Cloudflare Pages` (`.github/workflows/deploy.yml`).
- Tag and push: `git tag vX.Y.Z && git push origin vX.Y.Z`; the `Release` workflow checks the tag matches `app/package.json`, tests, and publishes the GitHub release.
- Watch the Actions runs (`gh run list`, `gh run view`) until they finish.

## 6. Live checks (use Claude in Chrome)
- https://idid.care and https://app.idid.care load, show the new version (Settings → About for the app), no console errors.
- Anything specific to the release (headers, redirects, new feature).
- If it is a docs-only change, say so and skip app checks.

## 7. Trail log
- Post one line per the rule in `~/.claude/CLAUDE.md`: `~/.config/radventures/trail-post.sh ship idid "<text>"` (Bash with allowed_domains robsradventures.com). Rob's voice, 1-2 sentences, no links, no private details. Say in one line what you posted.

## Guardrails
- Never change secrets, DNS, Cloudflare settings or deploy config without asking Rob.
- If a deploy or Actions run fails: stop, report the error, don't retry blindly.
- Never put private details in notifications or logs.
- Finish with a recommended next step.
