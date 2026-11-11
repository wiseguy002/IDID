/**
 * The vault holds the device's data key, protected two ways:
 * by the person's passphrase, and by a one-time recovery code.
 * Only salts and ciphertext are stored; the passphrase and code never are.
 */
import type { Persist } from './idb';
import {
  PBKDF2_ITERATIONS, codeToSecret, deriveKeyFromPassphrase, deriveKeyFromSecret, newAesKey, newRecoveryCode,
  randomBytes, toB64, fromB64, unwrapAesKey, wrapAesKey,
} from './crypto';

export interface VaultRecord {
  version: 1;
  salt: string;
  iterations: number;
  byPassphrase: string;
  byRecovery: string;
  createdAt: number;
}

const KEY = 'vault';

export async function hasVault(p: Persist) {
  return !!(await p.get<VaultRecord>('kv', KEY));
}

async function wrapForPassphrase(dataKey: CryptoKey, passphrase: string) {
  const salt = randomBytes(16);
  const kek = await deriveKeyFromPassphrase(passphrase, salt);
  return { salt: toB64(salt), iterations: PBKDF2_ITERATIONS, byPassphrase: await wrapAesKey(dataKey, kek, 'vault:pass') };
}

export async function createVault(p: Persist, passphrase: string, dataKey?: CryptoKey) {
  const key = dataKey ?? (await newAesKey());
  const recoveryCode = newRecoveryCode();
  const recKek = await deriveKeyFromSecret(codeToSecret(recoveryCode), 'idid-recovery');
  const v: VaultRecord = {
    version: 1, ...(await wrapForPassphrase(key, passphrase)),
    byRecovery: await wrapAesKey(key, recKek, 'vault:recovery'), createdAt: Date.now(),
  };
  await p.put('kv', KEY, v);
  return { dataKey: key, recoveryCode };
}

/** Returns the data key, or null if the passphrase is wrong. */
export async function unlockVault(p: Persist, passphrase: string): Promise<CryptoKey | null> {
  const v = await p.get<VaultRecord>('kv', KEY);
  if (!v) return null;
  try {
    const kek = await deriveKeyFromPassphrase(passphrase, fromB64(v.salt), v.iterations);
    return await unwrapAesKey(v.byPassphrase, kek, 'vault:pass');
  } catch { return null; }
}

export async function unlockWithRecovery(p: Persist, code: string): Promise<CryptoKey | null> {
  const v = await p.get<VaultRecord>('kv', KEY);
  if (!v) return null;
  try {
    const kek = await deriveKeyFromSecret(codeToSecret(code), 'idid-recovery');
    return await unwrapAesKey(v.byRecovery, kek, 'vault:recovery');
  } catch { return null; }
}

export async function changePassphrase(p: Persist, dataKey: CryptoKey, newPassphrase: string) {
  const v = await p.get<VaultRecord>('kv', KEY);
  if (!v) throw new Error('No vault');
  await p.put('kv', KEY, { ...v, ...(await wrapForPassphrase(dataKey, newPassphrase)) });
}

/** Issue a new recovery code (the old one stops working). */
export async function rotateRecoveryCode(p: Persist, dataKey: CryptoKey) {
  const v = await p.get<VaultRecord>('kv', KEY);
  if (!v) throw new Error('No vault');
  const recoveryCode = newRecoveryCode();
  const recKek = await deriveKeyFromSecret(codeToSecret(recoveryCode), 'idid-recovery');
  await p.put('kv', KEY, { ...v, byRecovery: await wrapAesKey(dataKey, recKek, 'vault:recovery') });
  return recoveryCode;
}

export function passphraseStrength(s: string): { ok: boolean; hint: string } {
  if (s.length < 8) return { ok: false, hint: 'Use at least 8 characters.' };
  const words = s.trim().split(/\s+/).length;
  if (words >= 3 || s.length >= 14) return { ok: true, hint: 'Strong.' };
  const classes = [/[a-z]/, /[A-Z]/, /\d/, /[^A-Za-z0-9]/].filter((r) => r.test(s)).length;
  if (classes >= 3 && s.length >= 10) return { ok: true, hint: 'Good.' };
  return { ok: true, hint: 'Okay. A few unrelated words make it stronger and easier to remember.' };
}
