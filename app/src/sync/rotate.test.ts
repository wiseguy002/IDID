import { describe, expect, it } from 'vitest';
import { memoryPersist } from '../data/idb';
import { Store } from '../data/store';
import { decryptJson, newAesKey } from '../data/crypto';
import { FakeServer } from './fakeRemote';
import { SyncEngine } from './engine';
import { KEYRING_RID, createAccount, createCircle, joinWithInvite, makeInvite, openCircle, restoreSession, rotateCircleKey, serialiseSession } from './keys';
import type { Entry } from '../types';

const ITER = 100_000;
const mem = () => { let v = { lastSeq: 0 }; return { load: async () => v, save: async (x: typeof v) => { v = x; } }; };
async function device() { const s = new Store(memoryPersist()); await s.open(await newAesKey()); return s; }
const entry = (id: string, notes: string, visibility: 'circle' | 'private' = 'circle'): Entry => ({
  id, subjectId: 'alex', authorId: 'alex', occurredAt: 1, loggedAt: 1, updatedAt: 1, timeApprox: false, location: '', triggers: [], mood: 3,
  feelings: [], frontingPartIds: [], frontingUnknown: false, coFronting: false, coFrontPartIds: [], lostTime: false, possibleCause: '',
  duration: null, noticedByIds: [], noticedByOthers: '', intensity: null, notes, visibility, followUps: [],
});

describe('circle key rotation', () => {
  it('locks a removed member out of new data while everyone else keeps everything', async () => {
    const server = new FakeServer();
    const A = server.as('u-alice'), B = server.as('u-bob'), C = server.as('u-carol');
    const alice = await createCircle(A, await createAccount(A, 'alice pass', ITER));
    const bob = await joinWithInvite(B, await createAccount(B, 'bob pass', ITER), await makeInvite(A, alice));
    const carol = await joinWithInvite(C, await createAccount(C, 'carol pass', ITER), await makeInvite(A, alice));

    // Shared data, plus Bob's own "only me" entry.
    const aStore = await device(); const bStore = await device();
    await aStore.put('entries', entry('e1', 'before removal'));
    await new SyncEngine(aStore, A, alice, mem()).sync();
    await bStore.put('entries', entry('b-private', 'only bob', 'private'));
    const bEng = new SyncEngine(bStore, B, bob, mem());
    await bEng.sync();
    const pending = await makeInvite(A, alice);

    // Alice removes Carol and changes the key. Carol keeps her old key.
    const carolOldKey = carol.circleKey;
    await C.removeMember(alice.circleId, 'u-carol').catch(() => undefined);
    await A.removeMember(alice.circleId, 'u-carol');
    const alice2 = await rotateCircleKey(A, alice);
    expect(alice2.keyVersion).toBe(2);
    expect(await A.getInvite(pending.split('.')[0])).toBeNull(); // unused invites carried the old key

    // New data after rotation is written with the new key.
    const aEng = new SyncEngine(aStore, A, alice2, mem());
    await aStore.put('entries', entry('e2', 'after removal'));
    await aEng.sync();

    // Carol's old key opens none of the shared rows on the server any more.
    const rows = [...server.records.values()].filter((r) => r.ct.startsWith('c:'));
    expect(rows.length).toBeGreaterThan(0);
    for (const r of rows) await expect(decryptJson(carolOldKey, r.ct.slice(2), `${alice.circleId}:${r.rid}`)).rejects.toBeDefined();

    // Bob's running engine still has the old key: it notices the change and asks to reopen.
    let rekey = 0;
    bEng.onRekey = () => { rekey++; };
    await bEng.sync();
    expect(rekey).toBe(1);
    const bob2 = await openCircle(B, bob, alice.circleId);
    expect(bob2?.keyVersion).toBe(2);
    const bEng2 = new SyncEngine(bStore, B, bob2!, mem());
    await bEng2.sync();
    expect(bStore.get('entries', 'e1')?.notes).toBe('before removal');
    expect(bStore.get('entries', 'e2')?.notes).toBe('after removal');
    // Record ids didn't change, so Bob's private entry (which Alice couldn't re-encrypt) still opens.
    expect(await bEng2.rid('entries', 'b-private')).toBe(await new SyncEngine(bStore, B, bob, mem()).rid('entries', 'b-private'));
    const fresh = await device();
    await new SyncEngine(fresh, B, bob2!, mem()).sync();
    expect(fresh.get('entries', 'b-private')?.notes).toBe('only bob');
    expect(fresh.get('entries', 'e2')?.notes).toBe('after removal');

    // Carol can't read the server at all any more, and can't reopen the circle.
    await expect(C.pull(alice.circleId, 0, 100)).rejects.toThrow();
    expect(await openCircle(C, carol, alice.circleId)).toBeNull();
    expect(server.records.has(`${alice.circleId}:${KEYRING_RID}`)).toBe(true);
  });

  it('reads and re-saves rows a lagging device wrote with the old key', async () => {
    const server = new FakeServer();
    const A = server.as('u-alice'), B = server.as('u-bob');
    const alice = await createCircle(A, await createAccount(A, 'alice pass', ITER));
    const bob = await joinWithInvite(B, await createAccount(B, 'bob pass', ITER), await makeInvite(A, alice));
    const alice2 = await rotateCircleKey(A, alice);

    // Bob hasn't noticed yet and pushes with the old key.
    const bStore = await device();
    await bStore.put('entries', entry('late', 'written with the old key'));
    await new SyncEngine(bStore, B, bob, mem()).pushOnce();

    const aStore = await device();
    const aEng = new SyncEngine(aStore, A, alice2, mem());
    await aEng.sync();
    expect(aStore.get('entries', 'late')?.notes).toBe('written with the old key');
    await aEng.sync(); // the re-save goes out with the new key
    // Every shared row on the server, including Bob's late one, now opens with the new key.
    const shared = [...server.records.values()].filter((r) => r.ct.startsWith('c:'));
    expect(shared.length).toBe(1);
    for (const r of shared) await expect(decryptJson(alice2.circleKey, r.ct.slice(2), `${alice.circleId}:${r.rid}`)).resolves.toBeDefined();
  });

  it('keeps the keyring in the saved session, so offline restarts use the same record ids', async () => {
    const server = new FakeServer();
    const A = server.as('u-alice');
    const alice = await createCircle(A, await createAccount(A, 'alice pass', ITER));
    const alice2 = await rotateCircleKey(A, alice);
    const back = await restoreSession(await serialiseSession(alice2, 'a@example.com'));
    const s = await device();
    const viaSaved = new SyncEngine(s, A, { ...back, circleId: back.circleId!, circleKey: back.circleKey! }, mem());
    const original = new SyncEngine(s, A, alice, mem());
    expect(await viaSaved.rid('entries', 'x')).toBe(await original.rid('entries', 'x'));
    expect(back.keyVersion).toBe(2);
  });
});
