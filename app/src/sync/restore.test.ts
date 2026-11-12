import { describe, expect, it } from 'vitest';
import { memoryPersist } from '../data/idb';
import { Store } from '../data/store';
import { newAesKey } from '../data/crypto';
import { hasVault, unlockVault, unlockWithRecovery } from '../data/vault';
import { FakeServer } from './fakeRemote';
import { SyncEngine } from './engine';
import { createAccount, createCircle, joinWithInvite, makeInvite } from './keys';
import { restoreJournal } from './restore';
import type { Entry } from '../types';

const ITER = 100_000; // account key stretching kept low for test speed
const PASS = 'lantern otter maple tea';

const entry = (id: string, over: Partial<Entry> = {}): Entry => ({
  id, subjectId: 'alex', authorId: 'alex', occurredAt: 1, loggedAt: 1, updatedAt: 1, timeApprox: false, location: 'Kitchen',
  triggers: [], mood: 2, feelings: [], frontingPartIds: [], frontingUnknown: false, coFronting: false, coFrontPartIds: [],
  lostTime: false, possibleCause: '', duration: null, noticedByIds: [], noticedByOthers: '', intensity: null,
  notes: 'shared note', visibility: 'circle', followUps: [], ...over,
});
const mem = () => { let v = { lastSeq: 0 }; return { load: async () => v, save: async (x: typeof v) => { v = x; } }; };

/** Alice's first device: account, circle, and some data synced up. Bob is in the circle too. */
async function aliceWithCircle() {
  const server = new FakeServer();
  const aliceR = server.as('u-alice');
  const acct = await createAccount(aliceR, PASS, ITER);
  const circle = await createCircle(aliceR, acct);
  const bobR = server.as('u-bob');
  const bobCircle = await joinWithInvite(bobR, await createAccount(bobR, 'bob pass phrase', ITER), await makeInvite(aliceR, circle));

  const a = new Store(memoryPersist());
  await a.open(await newAesKey());
  await a.put('members', { id: 'alex', name: 'Alex', role: 'self', tracked: true, canView: true, canObserve: true, color: '', createdAt: 0, userId: 'u-alice' });
  await a.put('members', { id: 'sam', name: 'Sam', role: 'partner', tracked: false, canView: true, canObserve: true, color: '', createdAt: 1, userId: 'u-bob' });
  await a.put('entries', entry('e1'));
  await a.put('entries', entry('e2', { visibility: 'private', notes: 'only alex' }));
  await a.put('board', { id: 'b1', memberId: 'alex', fromPartId: null, toPartIds: [], text: 'note to us', createdAt: 1 } as never);
  const eng = new SyncEngine(a, aliceR, circle, mem());
  eng.myMemberIds = () => ['alex'];
  await eng.sync();

  // Bob's own private entry must never reach Alice's new device.
  const b = new Store(memoryPersist());
  await b.open(await newAesKey());
  await b.put('entries', entry('bob-private', { subjectId: 'sam', authorId: 'sam', visibility: 'private', notes: 'only sam' }));
  const bEng = new SyncEngine(b, bobR, bobCircle, mem());
  bEng.myMemberIds = () => ['sam'];
  await bEng.sync();
  return { server };
}

describe('restoring a journal on a new device', () => {
  it('brings back shared and private data, picks the right profile, and locks it with the same passphrase', async () => {
    const { server } = await aliceWithCircle();
    const persist = memoryPersist();
    const store = new Store(persist);
    let handedOver = false;
    const r = await restoreJournal({ remote: server.as('u-alice'), persist, store, passphrase: PASS, syncState: mem(), beforeOpen: () => { handedOver = true; } });

    expect(r.result).toBe('ok');
    if (r.result !== 'ok') return;
    expect(handedOver).toBe(true);
    expect(r.meId).toBe('alex');
    expect(r.entries).toBe(2);
    expect(store.get('entries', 'e1')?.notes).toBe('shared note');
    expect(store.get('entries', 'e2')?.notes).toBe('only alex');
    expect(store.all('board').map((n) => n.text)).toEqual(['note to us']);
    expect(store.get('entries', 'bob-private')).toBeUndefined();
    expect(store.all('members').map((m) => m.name).sort()).toEqual(['Alex', 'Sam']);

    // This device's journal opens with the same passphrase, and with its own recovery code.
    expect(await unlockVault(persist, PASS)).not.toBeNull();
    expect(await unlockVault(persist, 'something else')).toBeNull();
    expect(await unlockWithRecovery(persist, r.recoveryCode)).not.toBeNull();
  }, 30000);

  it('creates nothing on the device when the passphrase is wrong', async () => {
    const { server } = await aliceWithCircle();
    const persist = memoryPersist();
    const r = await restoreJournal({ remote: server.as('u-alice'), persist, store: new Store(persist), passphrase: 'not my passphrase', syncState: mem() });
    expect(r.result).toBe('wrong-passphrase');
    expect(await hasVault(persist)).toBe(false);
  }, 30000);

  it('explains when there is no account, or no circle to restore from', async () => {
    const server = new FakeServer();
    const p1 = memoryPersist();
    expect((await restoreJournal({ remote: server.as('u-new'), persist: p1, store: new Store(p1), passphrase: PASS, syncState: mem() })).result).toBe('no-account');

    await createAccount(server.as('u-solo'), PASS, ITER); // signed in once, never made a circle
    const p2 = memoryPersist();
    expect((await restoreJournal({ remote: server.as('u-solo'), persist: p2, store: new Store(p2), passphrase: PASS, syncState: mem() })).result).toBe('no-circle');
    expect(await hasVault(p1)).toBe(false);
    expect(await hasVault(p2)).toBe(false);
  }, 30000);

  it('refuses to overwrite a journal already on this device', async () => {
    const { server } = await aliceWithCircle();
    const persist = memoryPersist();
    const first = await restoreJournal({ remote: server.as('u-alice'), persist, store: new Store(persist), passphrase: PASS, syncState: mem() });
    expect(first.result).toBe('ok');
    await expect(restoreJournal({ remote: server.as('u-alice'), persist, store: new Store(persist), passphrase: PASS, syncState: mem() })).rejects.toThrow(/already has a journal/);
  }, 30000);
});
