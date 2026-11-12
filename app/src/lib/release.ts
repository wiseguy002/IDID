/**
 * Pure helpers for cutting a release from CHANGELOG.md (used by scripts/release.mjs and tests).
 */
import { SEMVER } from './changelog';

export type Bump = 'major' | 'minor' | 'patch';

export function bumpVersion(v: string, kind: Bump): string {
  if (!SEMVER.test(v)) throw new Error(`Not a version: ${v}`);
  const [a, b, c] = v.split('.').map(Number);
  return kind === 'major' ? `${a + 1}.0.0` : kind === 'minor' ? `${a}.${b + 1}.0` : `${a}.${b}.${c + 1}`;
}

/**
 * Moves everything under "## [Unreleased]" into a new "## [version] - date" section,
 * leaves an empty Unreleased section, and updates the compare links at the bottom.
 */
export function cutRelease(md: string, version: string, date: string, repo = 'https://github.com/wiseguy002/IDID'): string {
  if (!SEMVER.test(version)) throw new Error(`Not a version: ${version}`);
  if (md.includes(`## [${version}]`)) throw new Error(`${version} is already in the changelog`);
  const start = md.indexOf('## [Unreleased]');
  if (start < 0) throw new Error('No "## [Unreleased]" section');
  const bodyStart = md.indexOf('\n', start) + 1;
  const next = md.indexOf('\n## [', bodyStart);
  const end = next < 0 ? md.indexOf('\n[Unreleased]:') : next + 1;
  const body = md.slice(bodyStart, end).trim();
  if (!/^### /m.test(body)) throw new Error('Nothing under Unreleased. Add at least one "### Added/Changed/Fixed…" list first.');
  const prevMatch = md.slice(end).match(/^## \[(\d+\.\d+\.\d+)\]/m);
  const prev = prevMatch?.[1];
  let out = `${md.slice(0, bodyStart)}\n## [${version}] - ${date}\n\n${body}\n\n${md.slice(end)}`;
  out = out.replace(/^\[Unreleased\]: .*$/m, `[Unreleased]: ${repo}/compare/v${version}...HEAD`);
  const link = prev ? `[${version}]: ${repo}/compare/v${prev}...v${version}` : `[${version}]: ${repo}/releases/tag/v${version}`;
  out = out.replace(/^(\[Unreleased\]: .*)$/m, `$1\n${link}`);
  return out.replace(/\n{3,}/g, '\n\n');
}

/** The notes for one version, for a GitHub release. */
export function notesFor(md: string, version: string): string {
  const start = md.indexOf(`## [${version}]`);
  if (start < 0) throw new Error(`${version} not found in changelog`);
  const bodyStart = md.indexOf('\n', start) + 1;
  const next = md.indexOf('\n## [', bodyStart);
  const linkDefs = md.indexOf('\n[Unreleased]:', bodyStart);
  const end = next >= 0 ? next : linkDefs >= 0 ? linkDefs : md.length;
  return md.slice(bodyStart, end).trim();
}
