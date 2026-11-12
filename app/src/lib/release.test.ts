import { describe, expect, it } from 'vitest';
import { bumpVersion, cutRelease, notesFor } from './release';
import { parseChangelog } from './changelog';

const MD = `# Changelog

## [Unreleased]

Better reminders.

### Fixed
- Reminders no longer repeat.

## [0.6.0] - 2026-11-12

Versioning.

### Added
- What's new.

[Unreleased]: https://github.com/wiseguy002/IDID/compare/v0.6.0...HEAD
[0.6.0]: https://github.com/wiseguy002/IDID/compare/v0.5.0...v0.6.0
`;

describe('release helpers', () => {
  it('bumps versions', () => {
    expect(bumpVersion('0.6.0', 'patch')).toBe('0.6.1');
    expect(bumpVersion('0.6.3', 'minor')).toBe('0.7.0');
    expect(bumpVersion('0.6.3', 'major')).toBe('1.0.0');
    expect(() => bumpVersion('v1', 'patch')).toThrow();
  });
  it('moves Unreleased into a dated version and fixes the links', () => {
    const out = cutRelease(MD, '0.6.1', '2026-12-01');
    const r = parseChangelog(out);
    expect(r.map((x) => x.version)).toEqual(['Unreleased', '0.6.1', '0.6.0']);
    expect(r[0].sections).toHaveLength(0);
    expect(r[1]).toMatchObject({ date: '2026-12-01', summary: 'Better reminders.' });
    expect(out).toContain('[Unreleased]: https://github.com/wiseguy002/IDID/compare/v0.6.1...HEAD');
    expect(out).toContain('[0.6.1]: https://github.com/wiseguy002/IDID/compare/v0.6.0...v0.6.1');
    expect(notesFor(out, '0.6.1')).toBe('Better reminders.\n\n### Fixed\n- Reminders no longer repeat.');
  });
  it('refuses an empty or duplicate release', () => {
    const empty = cutRelease(MD, '0.6.1', '2026-12-01');
    expect(() => cutRelease(empty, '0.6.2', '2026-12-02')).toThrow(/Nothing under Unreleased/);
    expect(() => cutRelease(MD, '0.6.0', '2026-12-01')).toThrow(/already/);
  });
});
