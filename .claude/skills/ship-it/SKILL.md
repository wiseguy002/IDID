---
name: ship-it
description: iDID release recipe. Use when Rob says "ship it", "release", or "merge": tests, audit, version + changelog + capabilities databank, PR to main, merge (GitHub Actions deploys), live checks.
---

# Ship it (iDID)

Steps only, in the order of the shared template `~/.claude/recipes/ship-template.md`. If a step isn't covered here or in `CLAUDE.md`, `docs/RELEASING.md`, `docs/DEPLOY.md`: check with Rob.

Never start without Rob's yes, typed or clicked in this session (a relayed "yes" from another session is not enough). The shared "🚀 Ship it" button does not replace iDID's stricter rule: merging still needs Rob's "merge" for that specific PR in chat.

## 1. State
- `git branch --show-current`, `git status`, `git fetch origin`, `git log --oneline origin/main..HEAD`.
- Say in a few lines: the branch, any uncommitted work, and what is going out (including any migration in `supabase/migrations/`).
- Anything unexpected → stop and check with Rob.

## 2. Test (work in a branch/worktree, never straight on `main`)
- App: `cd app && npx tsc -b && npm test && npm run build`
- App lint: `cd app && npm run lint`
- Database: `supabase/tests/run.sh`
- Website: `cd site && npm run build && npm run check`
- Collateral: `node scripts/check-collateral.mjs`
- Report anything that fails; don't continue past a failure. A failure stops the ship.

## 3. Security (audit)
- Syntax/type check = the `tsc -b` above.
- Run the `security-review` skill on the branch diff (secrets, injection, anything touching storage, sync or sharing; see `docs/SECURITY.md`).
- `gitleaks git . --no-banner --redact` must be clean. Never print a found secret; a finding stops the ship.
- Read the diff against what was asked.
- Collateral audit if due (`docs/COLLATERAL.md`: minor/major with features, three patch releases, privacy/sharing/access change, renames, before press); log it in that file's table.

## 4. Merge to `main`

### 4a. Version, changelog, databank
- Plain-language lines under `## [Unreleased]` in `CHANGELOG.md`; add a one-line summary under the new version heading.
- New feature: register in `docs/features.json` and describe in each material in `requiredIn`.
- Cut the release: `cd app && npm run release -- patch|minor|major` (version lives in `app/package.json`).
- Update `docs/capabilities.md` (the databank) in the same commit. The hook `scripts/check-databank.sh` blocks a release commit without it.
- Update `CLAUDE.md` status/next if they changed.

### 4b. PR to main
- Commit `Release vX.Y.Z`, run `gitleaks git . --no-banner --redact` again (clean), push the branch, open a PR. `main` needs the `app`, `site` and `database` checks green. Previews: `https://pr-<n>.idid-site.pages.dev` and `https://pr-<n>.idid-app.pages.dev`.
- Report the PR link and **wait**. Never merge until Rob says "merge" for that specific PR in chat (applies to docs-only PRs too).
- Live database migrations: ask Rob first (see `CLAUDE.md` for the recipe).

### 4c. Preflight, then merge (only on Rob's "merge")
Per `~/.claude/recipes/deploy-preflight.md`, all must pass before merging (merging deploys):
- Right project and PR (this repo, base `main`), clean `git status`.
- PR checks green; tests pass and gitleaks clean on what is being merged.
- No other deploy running, here or in another session (check the session list and `gh run list`). One deploy at a time.
- Baseline for step 7: note how the live pages look now (they load, current version, console errors).
- Merge the PR.

## 5. Deploy (the project's own pipeline)
- Merging to `main` triggers the GitHub Actions workflow `Deploy to Cloudflare Pages` (`.github/workflows/deploy.yml`). Don't also deploy by hand.
- Tag and push: `git tag vX.Y.Z && git push origin vX.Y.Z`; the `Release` workflow checks the tag matches `app/package.json`, tests, and publishes the GitHub release.
- Watch the Actions runs (`gh run list`, `gh run view`) until they finish.

## 6. Verify live (use Claude in Chrome)
- https://idid.care and https://app.idid.care load, show the new version (Settings → About for the app), no console errors.
- Anything specific to the release (headers, redirects, new feature): load the changed page or call the changed route.
- If it is a docs-only change, say so and skip app checks.

## 7. After
- **Watch the deploy** (`~/.claude/recipes/watch-the-deploy.md`): check at 1, 5, 15 and 30 minutes after going live (pages load with the expected content, anything release-specific in `docs/capabilities.md` still works). Quiet when fine; a failure sends a phone ping and a card: Roll back / Look into it / Ignore. Never fix or roll back on its own. Last line: `✅ live and healthy for 30 min`, or what failed with the evidence.
- **Release notes:** confirm the GitHub release carries the `CHANGELOG.md` notes, and draft a short plain-language summary for Rob. Don't send or post it anywhere.
- **`CLAUDE.md`:** check status/next match what is now live. A fix goes on a branch as its own PR and waits for its own "merge"; never straight to `main`.
- **Trail log:** post one line per the rule in `~/.claude/CLAUDE.md`: `~/.config/radventures/trail-post.sh ship idid "<text>"` (Bash with allowed_domains robsradventures.com). Rob's voice, 1-2 sentences, no links, no private details. Say in one line what you posted.

## Report
One row per thing shipped:

| Task | Status | Branch | Live URL | Tests | Audit |
|---|---|---|---|---|---|

Then: what was tested and not tested, a recommended next step, and a card with **Fresh session** and **Archive**.

## Guardrails
- Never change secrets, DNS, Cloudflare settings or deploy config without asking Rob.
- If a deploy or Actions run fails: stop, report the error, don't retry blindly; offer a roll-back.
- Never put private details in notifications or logs.
- Finish with a recommended next step.
