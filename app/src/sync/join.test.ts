import { describe, expect, it } from 'vitest';
import { memoryPersist } from '../data/idb';
import { KINDS, Store } from '../data/store';
import { newAesKey } from '../data/crypto';
import { FakeServer } from './fakeRemote';
import { SyncEngine } from './engine';
import { createAccount, createCircle, joinWithInvite, makeInvite, openCircle } from './keys';
import { mergeMember } from '../lib/merge';
import type { Entry, Member } from '../types';

const ITER = 100_000;
const person = (id: string, over: Partial<Member> = {}): Member => ({ id, name: id, role: 'self', tracked: true, canView: true, canObserve: true, color: '', createdAt: 0, ...over });
const entry = (id: string, over: Partial<Entry>): Entry => ({
  id, subjectId: '', authorId: '', occurredAt: 1, loggedAt: 1, updatedAt: 1, timeApprox: false, location: '', triggers: [], mood: null, feelings: [],
  frontingPartIds: [], frontingUnknown: false, coFronting: false, coFrontPartIds: [], lostTime: false, possibleCause: '', duration: null,
  noticedByIds: [], noticedByOthers: '', intensity: null, notes: '', visibility: 'circle', followUps: [], ...over,
});
const mem = () => { let v = { lastSeq: 0 }; return { load: async () => v, save: async (x: typeof v) => { v = x; } }; };
async function device() { const s = new Store(memoryPersist()); await s.open(await newAesKey()); return s; }

describe('a family member joins after starting on their own', () => {
  it('moves their own circle into the family circle with one profile, private entries still private', async () => {
    const server = new FakeServer();
    const momR = server.as('u-mom'), samR = server.as('u-sam');

    // Mom's circle, with a profile she made for Sam and an invite for him.
    const mom = await createAccount(momR, 'mom pass phrase', ITER);
    const momCircle = await createCircle(momR, mom);
    const m = await device();
    await m.put('members', person('mom', { role: 'family', tracked: false, userId: 'u-mom' }));
    await m.put('members', person('sam', { name: 'Sam' }));
    await m.put('entries', entry('mom-saw', { subjectId: 'sam', authorId: 'mom', notes: 'from mom' }));
    const token = await makeInvite(momR, momCircle);
    await m.put('invitations', { id: token.split('.')[0], name: 'Sam', memberId: 'sam', role: 'member', link: '', contact: '', createdBy: 'mom', createdAt: 1, cancelledAt: null });
    const mEng = new SyncEngine(m, momR, momCircle, mem());
    mEng.myMemberIds = () => ['mom'];
    await mEng.sync();

    // Sam started on his own, with his own circle and journal. Lots of records, so his sync cursor is high.
    const sam = await createAccount(samR, 'sam pass phrase', ITER);
    const samSolo = await createCircle(samR, sam);
    const s = await device();
    await s.put('members', person('me', { name: 'Sam', userId: 'u-sam' }));
    for (let i = 0; i < 30; i++) await s.put('entries', entry(`own-${i}`, { subjectId: 'me', authorId: 'me', notes: `mine ${i}` }));
    await s.put('entries', entry('secret', { subjectId: 'me', authorId: 'me', visibility: 'private', notes: 'only sam' }));
    const soloState = mem();
    await new SyncEngine(s, samR, samSolo, soloState).sync();
    expect((await soloState.load()).lastSeq).toBeGreaterThan(0);

    // Sam joins Mom's circle: fresh cursor, upload everything, pull, then merge into Mom's profile for him.
    const joined = await joinWithInvite(samR, sam, token);
    await s.queueAll();
    const sEng = new SyncEngine(s, samR, joined, mem());
    sEng.myMemberIds = () => ['me', 'sam'];
    await sEng.sync();
    expect(s.get('entries', 'mom-saw')?.notes).toBe('from mom'); // pulled from the new circle
    expect(s.get('invitations', token.split('.')[0])?.memberId).toBe('sam'); // the invite says who it was for
    await mergeMember(s, 'me', 'sam');
    await s.patch('members', 'sam', { userId: 'u-sam' });
    await sEng.sync();
    await server.as('u-sam').deleteCircle(samSolo.circleId); // his old solo circle

    // Mom sees one Sam, with his entries, but not his private one.
    await mEng.sync();
    expect(m.all('members').map((x) => x.id).sort()).toEqual(['mom', 'sam']);
    expect(m.get('members', 'sam')?.userId).toBe('u-sam');
    expect(m.all('entries').filter((e) => e.subjectId === 'sam')).toHaveLength(31);
    expect(m.get('entries', 'secret')).toBeUndefined();
    expect(JSON.stringify(KINDS.map((k) => m.all(k)))).not.toContain('"me"');
    // Sam still has his private entry, now on his merged profile; his old circle is gone.
    expect(s.get('entries', 'secret')).toMatchObject({ subjectId: 'sam', notes: 'only sam' });
    expect((await samR.myMemberships()).map((x) => x.circle_id)).toEqual([momCircle.circleId]);
    // A new device for Sam opens the family circle.
    expect((await openCircle(samR, sam))?.circleId).toBe(momCircle.circleId);
  }, 30000);

  it('view-only members can read but their device never uploads', async () => {
    const server = new FakeServer();
    const ownerR = server.as('u-a'), viewR = server.as('u-v');
    const owner = await createAccount(ownerR, 'owner pass phrase', ITER);
    const circle = await createCircle(ownerR, owner);
    const a = await device();
    await a.put('entries', entry('e1', { subjectId: 'x', authorId: 'x', notes: 'shared' }));
    await new SyncEngine(a, ownerR, circle, mem()).sync();

    const viewer = await joinWithInvite(viewR, await createAccount(viewR, 'viewer pass phrase', ITER), await makeInvite(ownerR, circle, 'viewer'));
    const v = await device();
    await v.put('entries', entry('v1', { subjectId: 'x', authorId: 'y', notes: 'viewer wrote this' }));
    const vEng = new SyncEngine(v, viewR, viewer, mem());
    vEng.readOnly = true;
    await vEng.sync();
    expect(vEng.status).toBe('idle');
    expect(v.get('entries', 'e1')?.notes).toBe('shared');
    await expect(viewR.push(circle.circleId, [{ rid: 'r'.repeat(20), ct: 'x' }])).rejects.toThrow(/view only/);
    const b = await device();
    await new SyncEngine(b, ownerR, circle, mem()).sync();
    expect(b.get('entries', 'v1')).toBeUndefined();
  }, 30000);

  it('the owner can hand the circle to someone in it, and stays as a member', async () => {
    const server = new FakeServer();
    const momR = server.as('u-mom'), samR = server.as('u-sam');
    const mom = await createAccount(momR, 'mom pass phrase', ITER);
    const circle = await createCircle(momR, mom);
    await joinWithInvite(samR, await createAccount(samR, 'sam pass phrase', ITER), await makeInvite(momR, circle));
    await expect(samR.transferOwnership(circle.circleId, 'u-sam')).rejects.toThrow(/owner/);
    await expect(momR.transferOwnership(circle.circleId, 'u-stranger')).rejects.toThrow(/join the circle first/);
    await momR.transferOwnership(circle.circleId, 'u-sam');
    const roles = Object.fromEntries((await samR.circleMembers(circle.circleId)).map((m) => [m.user_id, m.role]));
    expect(roles).toEqual({ 'u-mom': 'member', 'u-sam': 'owner' });
    await expect(momR.setMemberRole(circle.circleId, 'u-sam', 'viewer')).rejects.toThrow(/owner/);
    await samR.setMemberRole(circle.circleId, 'u-mom', 'viewer');
    expect((await samR.circleMembers(circle.circleId)).find((m) => m.user_id === 'u-mom')?.role).toBe('viewer');
  }, 30000);
});
