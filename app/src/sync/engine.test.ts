import { describe, expect, it } from 'vitest';
import { memoryPersist } from '../data/idb';
import { Store } from '../data/store';
import { newAesKey } from '../data/crypto';
import { FakeServer } from './fakeRemote';
import { SyncEngine } from './engine';
import { createAccount, createCircle, joinWithInvite, makeInvite, openAccount, openCircle } from './keys';
import type { Entry } from '../types';

const ITER = 100_000; // keep tests fast; production uses 600k

function entry(id: string, over: Partial<Entry> = {}): Entry {
  return {
    id, subjectId: 'alex', authorId: 'alex', occurredAt: 1, loggedAt: 1, updatedAt: 1, timeApprox: false, location: 'Kitchen',
    triggers: ['Loud noise'], mood: 2, feelings: [], frontingPartIds: [], frontingUnknown: false, coFronting: false, coFrontPartIds: [],
    lostTime: false, possibleCause: 'The smoke alarm', duration: null, noticedByIds: [], noticedByOthers: '', intensity: null,
    notes: 'secret words', visibility: 'circle', followUps: [], ...over,
  };
}

async function device() {
  const s = new Store(memoryPersist());
  await s.open(await newAesKey());
  return s;
}
const mem = () => { let v = { lastSeq: 0 }; return { load: async () => v, save: async (x: typeof v) => { v = x; } }; };

describe('end-to-end encrypted sync', () => {
  it('shares circle data, hides private entries, and never shows plaintext to the server', async () => {
    const server = new FakeServer();
    const aliceR = server.as('u-alice'), bobR = server.as('u-bob');

    // Alice sets up her account and circle, with some data already on her device.
    const aliceAcct = await createAccount(aliceR, 'alice pass phrase', ITER);
    const aliceCircle = await createCircle(aliceR, aliceAcct);
    // Bob joins with an invite link (before Alice asks him anything).
    const token = await makeInvite(aliceR, aliceCircle);
    const bobAcct = await createAccount(bobR, 'bob pass phrase', ITER);
    const bobCircle = await joinWithInvite(bobR, bobAcct, token);
    const aStore = await device();
    await aStore.put('members', { id: 'alex', name: 'Alex', role: 'self', tracked: true, canView: true, canObserve: true, color: '', createdAt: 0, userId: 'u-alice' });
    await aStore.put('members', { id: 'sam', name: 'Sam', role: 'partner', tracked: false, canView: true, canObserve: true, color: '', createdAt: 1, userId: 'u-bob' });
    await aStore.put('entries', entry('e1'));
    await aStore.put('entries', entry('e2', { visibility: 'private', notes: 'only alex' }));
    await aStore.put('observations', { id: 'o1', entryId: 'e1', memberId: 'sam', status: 'requested', requestedAt: 1, noticed: [], partIds: [], duration: null, text: '', present: null });
    const aEng = new SyncEngine(aStore, aliceR, aliceCircle, mem());
    aEng.myMemberIds = () => ['alex'];
    await aEng.sync();
    expect(aEng.status).toBe('idle');

    const dump = JSON.stringify([...server.records.values(), ...server.profiles.values(), server.members]);
    for (const secret of ['secret words', 'only alex', 'Kitchen', 'Alex', 'smoke alarm', 'entries', 'observations']) expect(dump).not.toContain(secret);
    // The observation request scheduled a push for Bob, with no content.
    expect(server.reminders).toEqual([expect.objectContaining({ user_id: 'u-bob', kind: 'observation', tag: 'obs-o1' })]);

    await expect(joinWithInvite(server.as('u-carol'), await createAccount(server.as('u-carol'), 'carol pp', ITER), token)).rejects.toThrow(/expired|used/);
    const bStore = await device();
    const bEng = new SyncEngine(bStore, bobR, bobCircle, mem());
    await bEng.sync();
    expect(bStore.get('entries', 'e1')?.notes).toBe('secret words');
    expect(bStore.get('entries', 'e2')).toBeUndefined(); // Alex's private entry stays private
    expect(bStore.get('observations', 'o1')?.status).toBe('requested');

    // Bob answers; Alice receives it. Bob deletes nothing he can't see.
    await bStore.patch('observations', 'o1', { status: 'done', text: 'Went quiet' });
    await bEng.sync();
    await aEng.sync();
    expect(aStore.get('observations', 'o1')?.text).toBe('Went quiet');

    // Deletions propagate as tombstones; later edits win.
    await aStore.remove('entries', 'e1');
    await aEng.sync(); await bEng.sync();
    expect(bStore.get('entries', 'e1')).toBeUndefined();

    // Alice on a second device: passphrase opens her keys and her private entry.
    const again = await openAccount(aliceR, 'alice pass phrase');
    expect(again).not.toBe('wrong');
    expect(await openAccount(aliceR, 'nope')).toBe('wrong');
    const c2 = await openCircle(aliceR, again as Exclude<typeof again, 'wrong' | null>);
    const a2 = await device();
    await new SyncEngine(a2, aliceR, c2!, mem()).sync();
    expect(a2.get('entries', 'e2')?.notes).toBe('only alex');
  }, 30000);

  it('rejects a record moved to a different id (tamper check)', async () => {
    const server = new FakeServer();
    const r = server.as('u1');
    const s = await createCircle(r, await createAccount(r, 'pass phrase x', ITER));
    const st = await device();
    await st.put('entries', entry('e1'));
    const eng = new SyncEngine(st, r, s, mem());
    await eng.sync();
    const [rec] = [...server.records.values()];
    server.records.set(`${s.circleId}:fake`, { ...rec, rid: 'ffffffffffffffffffffffffffffffffffffffff', seq: 99 });
    const other = await device();
    await new SyncEngine(other, r, s, mem()).sync();
    expect(other.all('entries')).toHaveLength(1);
  }, 30000);
});
