import { describe, expect, it } from 'vitest';
import { csvCell, toCsv } from './csv';
import { entriesToCsv } from './util';
import type { Entry, Member } from '../types';

describe('csvCell', () => {
  it('leaves ordinary text alone', () => {
    expect(csvCell('Sleep tracking')).toBe('Sleep tracking');
    expect(csvCell('')).toBe('');
  });
  it('quotes commas, quotes and line breaks', () => {
    expect(csvCell('a, b')).toBe('"a, b"');
    expect(csvCell('say "hi"')).toBe('"say ""hi"""');
    expect(csvCell('two\nlines')).toBe('"two\nlines"');
    expect(csvCell('cr\rhere')).toBe('"cr\rhere"');
  });
  it('turns anything a spreadsheet would run as a formula into plain text', () => {
    expect(csvCell('=HYPERLINK("https://evil.test","click")')).toBe('"\'=HYPERLINK(""https://evil.test"",""click"")"');
    expect(csvCell('+1+1')).toBe("'+1+1");
    expect(csvCell('-2+3')).toBe("'-2+3");
    expect(csvCell('@SUM(A1)')).toBe("'@SUM(A1)");
    expect(csvCell('\t=1')).toBe("'\t=1");
    expect(csvCell('\r=1')).toBe('"\'\r=1"');
  });
  it('only looks at the first character', () => {
    expect(csvCell('a=b')).toBe('a=b');
  });
});

describe('toCsv', () => {
  it('joins cells and rows', () => {
    expect(toCsv([['kind', 'title'], ['idea', '=1+1']])).toBe("kind,title\nidea,'=1+1");
  });
});

describe('journal spreadsheet export', () => {
  it('keeps notes written by others from running as formulas', () => {
    const e = {
      id: 'e1', subjectId: 'alex', authorId: 'alex', occurredAt: 0, loggedAt: 0, updatedAt: 0, timeApprox: false, location: '@home',
      triggers: [], mood: null, feelings: [], frontingPartIds: [], frontingUnknown: false, coFronting: false, coFrontPartIds: [],
      lostTime: false, possibleCause: '', duration: null, noticedByIds: [], noticedByOthers: '', intensity: null,
      notes: '=HYPERLINK("https://evil.test")', visibility: 'circle', followUps: [],
    } as Entry;
    const csv = entriesToCsv([e], [{ id: 'alex', name: 'Alex' } as Member], []);
    const row = csv.split('\n')[1];
    expect(row).toContain(`"'=HYPERLINK(""https://evil.test"")"`);
    expect(row).toContain(",'@home,");
    expect(row.startsWith('1970-01-01T00:00:00.000Z,false,Alex,Alex,')).toBe(true);
  });
});
