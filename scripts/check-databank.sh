#!/bin/sh
# Claude Code PreToolUse hook (matcher: Bash). Reads the hook JSON on stdin.
# Blocks (exit 2) a `git commit` that stages a release (a version change in
# app/package.json) without docs/capabilities.md. A second try within 10 minutes passes.
input=$(cat)
case "$input" in
  *"git commit"*) ;;
  *) exit 0 ;;
esac
root=$(git rev-parse --show-toplevel 2>/dev/null) || exit 0
cd "$root" || exit 0
staged=$(git diff --cached --name-only)
# A release = the version line in app/package.json is part of the staged change.
case "$staged" in
  *app/package.json*) ;;
  *) exit 0 ;;
esac
git diff --cached -U0 -- app/package.json | grep -q '^[+-][[:space:]]*"version"' || exit 0
case "$staged" in
  *docs/capabilities.md*) exit 0 ;;
esac
marker="${TMPDIR:-/tmp}/databank-ok-$(basename "$root")"
if [ -n "$(find "$marker" -mmin -10 2>/dev/null)" ]; then
  exit 0
fi
: > "$marker"
echo "Release commit without docs/capabilities.md: update the databank first, or commit again if it truly needs no change" >&2
exit 2
