import { describe, expect, it } from 'vitest';
import { memoryPersist } from '../data/idb';
import { KINDS, Store } from '../data/store';
import { newAesKey } from '../data/crypto';
import { fillGaps, mergeMember } from './merge';
import type { Entry, Member } from '../types';

const person = (id: string, over: Partial<Member> = {}): Member => ({ id, name: id, role: 'self', tracked: true, canView: true, canObserve: true, color: '', createdAt: 0, ...over });
const entry = (id: string, over: Partial<Entry>): Entry => ({
  id, subjectId: '', authorId: '', occurredAt: 1, loggedAt: 1, updatedAt: 1, timeApprox: false, location: '', triggers: [], mood: null, feelings: [],
  frontingPartIds: [], frontingUnknown: false, coFronting: false, coFrontPartIds: [], lostTime: false, possibleCause: '', duration: null,
  noticedByIds: [], noticedByOthers: '', intensity: null, notes: '', visibility: 'circle', followUps: [], ...over,
});

describe('merging a person into another', () => {
  it('moves everything from their own profile onto the circle profile, keeping both sides’ data', async () => {
    const s = new Store(memoryPersist());
    await s.open(await newAesKey());
    // Mom set up a profile for Sam; Sam set up iDID on their own first ("me-local").
    await s.put('members', person('mom', { role: 'family', tracked: false, userId: 'u-mom' }));
    await s.put('members', person('sam', { name: 'Sam', tracked: true, userId: undefined }));
    await s.put('members', person('me-local', { name: 'Sam (me)', userId: 'u-sam', canObserve: false }));
    await s.put('entries', entry('mom-saw', { subjectId: 'sam', authorId: 'mom', notes: 'from mom' }));
    await s.put('entries', entry('sam-own', { subjectId: 'me-local', authorId: 'me-local', visibility: 'private', noticedByIds: ['mom', 'me-local'], followUps: [{ id: 'f1', memberId: 'me-local', text: 'later', createdAt: 2 }] }));
    await s.put('parts', { id: 'p1', memberId: 'me-local', name: 'Little one' } as never);
    await s.put('checkins', { id: 'c1', memberId: 'me-local', at: 1 } as never);
    await s.put('appointments', { id: 'a1', memberIds: ['me-local', 'mom'], createdBy: 'me-local' } as never);
    await s.put('alerts', { id: 'al1', fromMemberId: 'me-local', toMemberIds: ['mom'], ask: 'call', createdAt: 1, acks: { 'me-local': 5 }, resolvedAt: null });
    await s.put('safety', { id: 'safety:sam', memberId: 'sam', warningSigns: ['quiet'], reasons: '' } as never);
    await s.put('safety', { id: 'safety:me-local', memberId: 'me-local', warningSigns: ['quiet', 'pacing'], reasons: 'my cat' } as never);
    await s.put('body', { id: 'body:me-local:2026-11-12', memberId: 'me-local', date: '2026-11-12', sleepHours: 7, water: null } as never);
    await s.put('body', { id: 'body:sam:2026-11-12', memberId: 'sam', date: '2026-11-12', sleepHours: null, water: 4 } as never);
    await s.put('activity', { id: 'me-local', firsts: { pause: 5 }, counts: { pause: 2 }, badges: { pause: 6 }, dismissedTips: ['a'] } as never);
    await s.put('activity', { id: 'sam', firsts: { pause: 9 }, counts: { pause: 1 }, badges: {}, dismissedTips: ['b'] } as never);

    await mergeMember(s, 'me-local', 'sam');

    // No trace of the duplicate anywhere.
    const everything = JSON.stringify(KINDS.map((k) => s.all(k)));
    expect(everything).not.toContain('me-local');
    expect(s.all('members').map((m) => m.id).sort()).toEqual(['mom', 'sam']);
    const sam = s.get('members', 'sam')!;
    expect(sam).toMatchObject({ name: 'Sam', userId: 'u-sam', tracked: true, canObserve: true });

    const own = s.get('entries', 'sam-own')!;
    expect(own).toMatchObject({ subjectId: 'sam', authorId: 'sam', visibility: 'private', noticedByIds: ['mom', 'sam'] });
    expect(own.followUps[0].memberId).toBe('sam');
    expect(s.get('entries', 'mom-saw')).toMatchObject({ subjectId: 'sam', authorId: 'mom', notes: 'from mom' });
    expect(s.get('parts', 'p1')).toMatchObject({ memberId: 'sam' });
    expect(s.get('appointments', 'a1')).toMatchObject({ memberIds: ['sam', 'mom'], createdBy: 'sam' });
    expect(s.get('alerts', 'al1')).toMatchObject({ fromMemberId: 'sam', acks: { sam: 5 } });
    // Records keyed by person are combined, not overwritten.
    expect(s.get('safety', 'safety:sam')).toMatchObject({ warningSigns: ['quiet', 'pacing'], reasons: 'my cat' });
    expect(s.get('body', 'body:sam:2026-11-12')).toMatchObject({ sleepHours: 7, water: 4 });
    expect(s.get('activity', 'sam')).toMatchObject({ counts: { pause: 3 }, firsts: { pause: 5 }, badges: { pause: 6 }, dismissedTips: ['b', 'a'] });
  });

  it('fills gaps without overwriting what is already there', () => {
    expect(fillGaps({ a: 'keep', b: '', c: [1], d: [{ id: 'x' }] }, { a: 'no', b: 'fill', c: [1, 2], d: [{ id: 'x' }, { id: 'y' }] }))
      .toEqual({ a: 'keep', b: 'fill', c: [1, 2], d: [{ id: 'x' }, { id: 'y' }] });
  });

  it('refuses unknown people and ignores merging someone into themselves', async () => {
    const s = new Store(memoryPersist());
    await s.open(await newAesKey());
    await s.put('members', person('a'));
    await mergeMember(s, 'a', 'a');
    expect(s.get('members', 'a')).toBeDefined();
    await expect(mergeMember(s, 'a', 'nobody')).rejects.toThrow(/Unknown person/);
  });
});
