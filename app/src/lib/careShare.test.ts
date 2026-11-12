import { describe, expect, it } from 'vitest';
import { buildCarePayload, careLink, defaultScope, openPayload, parseCareToken, payloadHash, sealPayload, newShareKey, type CareData } from './careShare';
import type { CareShare, Entry, ShareScope } from '../types';

const entry = (id: string, over: Partial<Entry>): Entry => ({
  id, subjectId: 'sam', authorId: 'sam', occurredAt: Date.now() - 86400000, loggedAt: 1, updatedAt: 1, timeApprox: false, location: 'Kitchen', triggers: ['Noise'], mood: 2, feelings: ['scared'],
  frontingPartIds: ['p1'], frontingUnknown: false, coFronting: false, coFrontPartIds: [], lostTime: true, possibleCause: 'alarm', duration: 'minutes',
  noticedByIds: [], noticedByOthers: '', intensity: null, notes: 'SECRET NOTE', visibility: 'circle', followUps: [], ...over,
});
const data: CareData = {
  members: [{ id: 'sam', name: 'Sam', role: 'self', tracked: true, canView: true, canObserve: true, color: '', createdAt: 0, support: { zip: '70801', needs: ['trauma'] as never } },
    { id: 'jo', name: 'Jo', role: 'self', tracked: true, canView: true, canObserve: true, color: '', createdAt: 0 }],
  parts: [{ id: 'p1', memberId: 'sam', name: 'PART-NAME', color: '', createdAt: 0 }],
  entries: [entry('e1', {}), entry('e2', { visibility: 'private', notes: 'ONLY-ME' }), entry('jo1', { subjectId: 'jo', notes: 'JO-ENTRY' }), entry('old', { occurredAt: Date.now() - 400 * 86400000, notes: 'OLD' })],
  observations: [{ id: 'o1', entryId: 'e1', memberId: 'jo', status: 'done', requestedAt: 1, noticed: ['froze'], partIds: [], duration: null, text: 'OBS-TEXT', present: true }],
  checkins: [{ id: 'c1', memberId: 'sam', at: Date.now() - 1000, feeling: 'wobbly', tried: null, helped: null }],
  safety: [{ id: 'safety:sam', memberId: 'sam', warningSigns: ['SIGN'], coping: [], distractions: [], helperContactIds: [], proContactIds: [], safeSteps: [], reasons: ['REASON'], visibility: 'private', updatedAt: 1 }],
  meds: [{ id: 'm1', memberId: 'sam', name: 'MED-NAME', dose: '5mg', times: ['08:00'], remind: true, notes: '', active: true, createdAt: 1 }],
  appointments: [], prep: [], contacts: [], partWord: { one: 'part', many: 'parts' },
};
const share = (scope: Partial<ShareScope>, over: Partial<CareShare> = {}): CareShare => ({
  id: '00000000-0000-4000-8000-000000000001', key: newShareKey(), name: 'Dr. Lee', role: 'therapist', contact: '', subjectId: 'sam', memberId: null,
  scope: { ...defaultScope('friend'), summary: false, entries: false, ...scope }, range: '90', expiresAt: null, consentedAt: 1, createdAt: 1, updatedAt: 1, publishedAt: null, publishedHash: '', ...over,
});
const text = (sc: Partial<ShareScope>, over?: Partial<CareShare>) => JSON.stringify(buildCarePayload(data, share(sc, over)));

describe('care-team shared views', () => {
  it('includes only what was chosen', () => {
    const summaryOnly = text({ summary: true });
    expect(summaryOnly).toContain('"total":1');
    for (const s of ['SECRET NOTE', '"location":"Kitchen"', '"entries":[', 'PART-NAME', 'OBS-TEXT', 'MED-NAME', 'SIGN', 'wobbly', 'ONLY-ME']) expect(summaryOnly).not.toContain(s);

    const entriesNoNotes = text({ entries: true });
    expect(entriesNoNotes).toContain('Kitchen');
    for (const s of ['SECRET NOTE', 'alarm', 'PART-NAME', 'OBS-TEXT']) expect(entriesNoNotes).not.toContain(s);

    const full = text({ ...defaultScope('therapist'), meds: true });
    for (const s of ['SECRET NOTE', 'PART-NAME', 'OBS-TEXT', 'MED-NAME', 'SIGN', 'REASON', 'wobbly', 'trauma']) expect(full).toContain(s);
  });

  it('never includes other people, older moments, or “only me” moments unless chosen', () => {
    const t = text({ entries: true, notes: true });
    expect(t).not.toContain('JO-ENTRY');
    expect(t).not.toContain('OLD');
    expect(t).not.toContain('ONLY-ME');
    expect(text({ entries: true, notes: true, privateEntries: true })).toContain('ONLY-ME');
    expect(text({ entries: true, notes: true }, { range: 'all' })).toContain('OLD');
  });

  it('only changes fingerprint when the content changes', () => {
    const s = share({ summary: true, entries: true });
    const a = buildCarePayload(data, s, 1000), b = buildCarePayload(data, s, 999999);
    expect(payloadHash(a)).toBe(payloadHash(b));
    expect(payloadHash(buildCarePayload({ ...data, entries: [...data.entries, entry('e3', {})] }, s))).not.toBe(payloadHash(a));
  });

  it('encrypts so only the link’s key opens it, and only for that share', async () => {
    const s = share({ summary: true });
    const p = buildCarePayload(data, s);
    const ct = await sealPayload(p, s.key, s.id);
    expect(ct).not.toContain('Sam');
    expect((await openPayload(ct, s.key, s.id)).who).toBe('Sam');
    await expect(openPayload(ct, newShareKey(), s.id)).rejects.toThrow();
    await expect(openPayload(ct, s.key, '00000000-0000-4000-8000-000000000002')).rejects.toThrow();
  });

  it('round-trips the link', () => {
    const s = share({});
    const link = careLink(s, 'https://app.idid.care/');
    expect(link.startsWith('https://app.idid.care/#care=')).toBe(true);
    expect(parseCareToken(link.slice(link.indexOf('#')))).toEqual({ id: s.id, key: s.key });
    expect(parseCareToken('#care=nope')).toBeNull();
  });
});
