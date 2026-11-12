import { describe, expect, it } from 'vitest';
import { memoryPersist } from './idb';
import { Store } from './store';
import { createVault, unlockVault, unlockWithRecovery, changePassphrase, rotateRecoveryCode } from './vault';
import { decryptJson, encryptJson, newAesKey, newIdentity, openSealedKey, sealKey, exportPrivate, importPrivate, deriveKeyFromPassphrase, randomBytes } from './crypto';

describe('crypto', () => {
  it('round-trips JSON and rejects the wrong AAD', async () => {
    const k = await newAesKey();
    const box = await encryptJson(k, { a: 1 }, 'entries:1');
    expect(await decryptJson(k, box, 'entries:1')).toEqual({ a: 1 });
    await expect(decryptJson(k, box, 'entries:2')).rejects.toThrow();
  });
  it('seals a key so only the recipient can open it', async () => {
    const alice = await newIdentity(), bob = await newIdentity();
    const circleKey = await newAesKey();
    const sealed = await sealKey(circleKey, bob.publicJwk, 'circle:x');
    const opened = await openSealedKey(sealed, bob, 'circle:x');
    const box = await encryptJson(circleKey, 'hi');
    expect(await decryptJson(opened, box)).toBe('hi');
    await expect(openSealedKey(sealed, alice, 'circle:x')).rejects.toThrow();
  });
  it('exports and re-imports an identity under a passphrase', async () => {
    const id = await newIdentity();
    const kek = await deriveKeyFromPassphrase('correct horse battery', randomBytes(16), 1000);
    const back = await importPrivate(await exportPrivate(id, kek), id.publicJwk, kek);
    const k = await newAesKey();
    expect(await openSealedKey(await sealKey(k, id.publicJwk, 'a'), back, 'a')).toBeTruthy();
  });
});

describe('vault', () => {
  it('unlocks with passphrase or recovery code, not with a wrong one', async () => {
    const p = memoryPersist();
    const { dataKey, recoveryCode } = await createVault(p, 'blue river morning');
    const box = await encryptJson(dataKey, 'secret');
    expect(await unlockVault(p, 'wrong')).toBeNull();
    const k1 = await unlockVault(p, 'blue river morning');
    expect(await decryptJson(k1!, box)).toBe('secret');
    const k2 = await unlockWithRecovery(p, recoveryCode.toLowerCase().replace(/-/g, ' '));
    expect(await decryptJson(k2!, box)).toBe('secret');
    await changePassphrase(p, dataKey, 'new phrase here');
    expect(await unlockVault(p, 'blue river morning')).toBeNull();
    expect(await unlockVault(p, 'new phrase here')).not.toBeNull();
    const code2 = await rotateRecoveryCode(p, dataKey);
    expect(await unlockWithRecovery(p, recoveryCode)).toBeNull();
    expect(await unlockWithRecovery(p, code2)).not.toBeNull();
  }, 30000);
});

describe('store', () => {
  it('persists only ciphertext and reloads after unlock', async () => {
    const p = memoryPersist();
    const key = await newAesKey();
    const s = new Store(p);
    await s.open(key);
    await s.put('parts', { id: 'p1', memberId: 'm', name: 'Robin', color: '#000', createdAt: 1 });
    const raw = JSON.stringify(await p.getAll('records'));
    expect(raw).not.toContain('Robin');
    const s2 = new Store(p);
    await s2.open(key);
    expect(s2.get('parts', 'p1')?.name).toBe('Robin');
    expect((await s2.outbox()).length).toBe(1);
  });
  it('keeps tombstones and applies last-write-wins', async () => {
    const s = new Store(memoryPersist());
    await s.open(await newAesKey());
    await s.put('parts', { id: 'p1', memberId: 'm', name: 'A', color: '', createdAt: 1 });
    await s.remove('parts', 'p1');
    expect(s.all('parts')).toHaveLength(0);
    expect(s.envelope('parts', 'p1')?.deleted).toBe(true);
    expect(await s.applyRemote({ kind: 'parts', id: 'p1', updatedAt: 1, deleted: false, data: { name: 'old' } })).toBe(false);
    expect(await s.applyRemote({ kind: 'parts', id: 'p1', updatedAt: Date.now() + 1000, deleted: false, data: { id: 'p1', name: 'B' } })).toBe(true);
    expect(s.get('parts', 'p1')?.name).toBe('B');
  });
});
