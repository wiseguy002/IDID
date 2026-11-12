import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import { SEMVER, boldSegments, compareVersions, parseChangelog, releasesBetween } from './changelog';

const md = readFileSync(resolve(__dirname, '../../../CHANGELOG.md'), 'utf8');
const pkg = JSON.parse(readFileSync(resolve(__dirname, '../../package.json'), 'utf8')) as { version: string };
const releases = parseChangelog(md);
const released = releases.filter((r) => r.version !== 'Unreleased');

describe('CHANGELOG.md and the app version agree', () => {
  it('has an Unreleased section first, then versions', () => {
    expect(releases[0].version).toBe('Unreleased');
    expect(released.length).toBeGreaterThan(0);
  });
  it('lists the current package.json version as the newest release', () => {
    expect(SEMVER.test(pkg.version)).toBe(true);
    expect(released[0].version).toBe(pkg.version);
  });
  it('uses valid, strictly descending versions with dates in order', () => {
    for (const r of released) {
      expect(r.version).toMatch(SEMVER);
      expect(r.date).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    }
    for (let i = 1; i < released.length; i++) {
      expect(compareVersions(released[i - 1].version, released[i].version)).toBeGreaterThan(0);
      expect(released[i - 1].date! >= released[i].date!).toBe(true);
    }
  });
  it('gives every release a summary and at least one change in a known section', () => {
    const allowed = ['Added', 'Changed', 'Deprecated', 'Removed', 'Fixed', 'Security'];
    for (const r of released) {
      expect(r.summary, r.version).not.toBe('');
      expect(r.sections.length, r.version).toBeGreaterThan(0);
      for (const s of r.sections) {
        expect(allowed, `${r.version}: ${s.title}`).toContain(s.title);
        expect(s.items.length, `${r.version}: ${s.title}`).toBeGreaterThan(0);
      }
    }
  });
  it('shows the same version in the README', () => {
    const readme = readFileSync(resolve(__dirname, '../../../README.md'), 'utf8');
    expect(readme).toContain(`Current version: ${pkg.version}`);
  });
  it('has a compare link for every version', () => {
    for (const r of releases) expect(md).toContain(`[${r.version}]: https://github.com/`);
  });
});

describe('changelog helpers', () => {
  it('compares versions numerically', () => {
    expect(compareVersions('0.10.0', '0.9.9')).toBeGreaterThan(0);
    expect(compareVersions('1.0.0', '1.0.0')).toBe(0);
  });
  it('finds what changed since the last version someone saw', () => {
    const r = parseChangelog('## [Unreleased]\n## [0.3.0] - 2026-01-03\nC\n### Added\n- c\n## [0.2.0] - 2026-01-02\nB\n### Fixed\n- b\n## [0.1.0] - 2026-01-01\nA\n### Added\n- a\n  continued\n');
    expect(releasesBetween(r, '0.1.0', '0.3.0').map((x) => x.version)).toEqual(['0.3.0', '0.2.0']);
    expect(releasesBetween(r, null, '0.2.0').map((x) => x.version)).toEqual(['0.2.0', '0.1.0']);
    expect(r[3].sections[0].items[0]).toBe('a continued');
  });
  it('splits bold text', () => {
    expect(boldSegments('A **What’s new** screen')).toEqual([{ text: 'A ', bold: false }, { text: 'What’s new', bold: true }, { text: ' screen', bold: false }]);
  });
});
