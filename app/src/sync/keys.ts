/**
 * Account and circle keys.
 *
 *  passphrase ──PBKDF2──▶ KEK ──▶ identity private key (stored on server, encrypted)
 *  identity   ──seal────▶ personal key (for "only me" entries)
 *  identity   ──seal────▶ circle key   (one sealed copy per member)
 *  invite secret (only in the link #fragment) ──HKDF──▶ wraps circle key for the invitee
 */
import {
  PBKDF2_ITERATIONS, deriveKeyFromPassphrase, deriveKeyFromSecret, exportPrivate, fromB64, importPrivate, newAesKey,
  newIdentity, openSealedKey, randomBytes, sealKey, toB64, unwrapAesKey, wrapAesKey, encryptJson, decryptJson, type Identity,
} from '../data/crypto';
import type { Remote } from './remote';

export interface AccountKeys { userId: string; identity: Identity; personalKey: CryptoKey }
export interface CircleSession extends AccountKeys {
  circleId: string;
  circleKey: CryptoKey;
  /** Earlier circle keys, from the keyring (newest first). Used only to read records written before a key change. */
  oldKeys?: CryptoKey[];
  /** Seed for record ids. It stays the same when the circle key changes, so record ids (and "only me" records) stay valid. */
  ridSeed?: Uint8Array<ArrayBuffer>;
  /** 1 for a circle whose key has never changed. */
  keyVersion?: number;
}

export async function createAccount(remote: Remote, passphrase: string, iterations = PBKDF2_ITERATIONS): Promise<AccountKeys> {
  const userId = remote.userId()!;
  const identity = await newIdentity();
  const personalKey = await newAesKey();
  const salt = randomBytes(16);
  const kek = await deriveKeyFromPassphrase(passphrase, salt, iterations);
  await remote.putProfile({
    id: userId, public_key: identity.publicJwk, key_salt: toB64(salt), key_iterations: iterations,
    wrapped_private_key: await exportPrivate(identity, kek, `identity:${userId}`),
    sealed_personal_key: await sealKey(personalKey, identity.publicJwk, `personal:${userId}`),
  });
  return { userId, identity, personalKey };
}

/** null = no account yet; 'wrong' = passphrase did not match. */
export async function openAccount(remote: Remote, passphrase: string): Promise<AccountKeys | null | 'wrong'> {
  const p = await remote.getProfile();
  if (!p) return null;
  try {
    const kek = await deriveKeyFromPassphrase(passphrase, fromB64(p.key_salt), p.key_iterations);
    const identity = await importPrivate(p.wrapped_private_key, p.public_key, kek, `identity:${p.id}`);
    const personalKey = await openSealedKey(p.sealed_personal_key, identity, `personal:${p.id}`);
    return { userId: p.id, identity, personalKey };
  } catch { return 'wrong'; }
}

export async function rewrapAccount(remote: Remote, acct: AccountKeys, newPassphrase: string) {
  const p = await remote.getProfile();
  if (!p) return;
  const salt = randomBytes(16);
  const kek = await deriveKeyFromPassphrase(newPassphrase, salt, PBKDF2_ITERATIONS);
  await remote.putProfile({ ...p, key_salt: toB64(salt), key_iterations: PBKDF2_ITERATIONS, wrapped_private_key: await exportPrivate(acct.identity, kek, `identity:${p.id}`) });
}

export async function createCircle(remote: Remote, acct: AccountKeys): Promise<CircleSession> {
  const circleKey = await newAesKey();
  const tmpId = 'new';
  // The AAD includes the circle id, which we only learn after creating it: seal, create, then re-seal.
  const circleId = await remote.createCircle(await sealKey(circleKey, acct.identity.publicJwk, `circle:${tmpId}`));
  return { ...acct, circleId, circleKey, oldKeys: [], keyVersion: 1 };
}

export async function openCircle(remote: Remote, acct: AccountKeys, circleId?: string): Promise<CircleSession | null> {
  const ms = await remote.myMemberships();
  // Without a specific circle, open the one this account joined most recently.
  const newest = [...ms].sort((a, b) => (b.created_at ?? '').localeCompare(a.created_at ?? ''))[0];
  const m = circleId ? ms.find((x) => x.circle_id === circleId) : newest;
  if (!m) return null;
  for (const aad of [`circle:${m.circle_id}`, 'circle:new']) {
    let circleKey: CryptoKey;
    try { circleKey = await openSealedKey(m.sealed_circle_key, acct.identity, aad); } catch { continue; }
    return withKeyring(remote, { ...acct, circleId: m.circle_id, circleKey });
  }
  throw new Error("Couldn't open this circle's key.");
}

/** Returns the token to put after `#invite=` in the link. The secret never reaches the server. */
export async function makeInvite(remote: Remote, s: CircleSession, role: 'member' | 'viewer' = 'member'): Promise<string> {
  const secret = randomBytes(32);
  const kek = await deriveKeyFromSecret(secret, 'idid-invite');
  const id = await remote.createInvite(s.circleId, await wrapAesKey(s.circleKey, kek, 'invite'), role);
  return `${id}.${toB64(secret)}`;
}

export async function joinWithInvite(remote: Remote, acct: AccountKeys, token: string): Promise<CircleSession> {
  const [id, secretB64] = token.split('.');
  if (!id || !secretB64) throw new Error('This invite link is incomplete.');
  const inv = await remote.getInvite(id);
  if (!inv) throw new Error('This invite has expired or was already used. Ask for a new link.');
  let circleKey: CryptoKey;
  try { circleKey = await unwrapAesKey(inv.wrapped_circle_key, await deriveKeyFromSecret(fromB64(secretB64), 'idid-invite'), 'invite'); }
  catch { throw new Error("This invite link doesn't look right. Ask for a new link."); }
  const circleId = await remote.acceptInvite(id, await sealKey(circleKey, acct.identity.publicJwk, `circle:${inv.circle_id}`));
  return withKeyring(remote, { ...acct, circleId, circleKey });
}

// ---------- Local cache (sealed with the device data key) ----------

export interface SavedSession {
  userId: string; circleId: string | null; email: string; publicJwk: JsonWebKey; priv: string; personal: string; circle: string | null;
  /** Keyring details (after a circle key change): earlier keys, the record-id seed and the key version. */
  old?: string[]; ridSeed?: string; keyVersion?: number;
}

const raw = async (k: CryptoKey) => toB64(new Uint8Array(await crypto.subtle.exportKey('raw', k)));
const aes = (b: string) => crypto.subtle.importKey('raw', fromB64(b), { name: 'AES-GCM' }, true, ['encrypt', 'decrypt']);

export type MaybeCircle = AccountKeys & { circleId: string | null; circleKey: CryptoKey | null } & Partial<Pick<CircleSession, 'oldKeys' | 'ridSeed' | 'keyVersion'>>;

export async function serialiseSession(s: AccountKeys & { circleId?: string | null; circleKey?: CryptoKey | null } & Partial<Pick<CircleSession, 'oldKeys' | 'ridSeed' | 'keyVersion'>>, email: string): Promise<SavedSession> {
  return {
    old: s.oldKeys ? await Promise.all(s.oldKeys.map(raw)) : undefined,
    ridSeed: s.ridSeed ? toB64(s.ridSeed) : undefined,
    keyVersion: s.keyVersion,
    userId: s.userId, email, circleId: s.circleId ?? null, publicJwk: s.identity.publicJwk,
    priv: toB64(new Uint8Array(await crypto.subtle.exportKey('pkcs8', s.identity.privateKey))),
    personal: await raw(s.personalKey), circle: s.circleKey ? await raw(s.circleKey) : null,
  };
}

export async function restoreSession(v: SavedSession): Promise<MaybeCircle> {
  const privateKey = await crypto.subtle.importKey('pkcs8', fromB64(v.priv), { name: 'ECDH', namedCurve: 'P-256' }, true, ['deriveKey']);
  return {
    userId: v.userId, identity: { publicJwk: v.publicJwk, privateKey }, personalKey: await aes(v.personal),
    circleId: v.circleId, circleKey: v.circle ? await aes(v.circle) : null,
    oldKeys: v.old ? await Promise.all(v.old.map(aes)) : undefined,
    ridSeed: v.ridSeed ? fromB64(v.ridSeed) : undefined,
    keyVersion: v.keyVersion,
  };
}

// ---------- Circle key rotation ----------

/** Server id of the keyring record. It's a fixed id rather than an HMAC, so it can be found before the record-id key is known. */
export const KEYRING_RID = 'keyring-circle-v1';
interface Keyring { v: number; ridSeed: string; old: string[] }
const rawKey = async (k: CryptoKey) => toB64(new Uint8Array(await crypto.subtle.exportKey('raw', k)));
const aesKey = (b: string) => crypto.subtle.importKey('raw', fromB64(b), { name: 'AES-GCM' }, true, ['encrypt', 'decrypt']);

export async function readKeyring(circleId: string, circleKey: CryptoKey, ct: string): Promise<Keyring> {
  if (!ct.startsWith('k:')) throw new Error('not a keyring');
  return decryptJson<Keyring>(circleKey, ct.slice(2), `${circleId}:keyring`);
}

/** Add what the circle's keyring knows (earlier keys, record-id seed, version) to a session. */
export async function withKeyring(remote: Remote, s: CircleSession): Promise<CircleSession> {
  const row = await remote.getRecord(s.circleId, KEYRING_RID);
  if (!row) return { ...s, oldKeys: [], keyVersion: 1 };
  const k = await readKeyring(s.circleId, s.circleKey, row.ct);
  return { ...s, oldKeys: await Promise.all(k.old.map(aesKey)), ridSeed: fromB64(k.ridSeed), keyVersion: k.v };
}

/**
 * Owner only, after removing someone: switch the circle to a brand-new key.
 * In one server step (all or nothing): seal the new key to everyone still in the circle, save the keyring
 * (earlier keys + record-id seed, encrypted with the new key) and cancel unused invites, which carry the old key.
 * Then call reencryptCircle to move the shared records over to the new key.
 * Someone who was removed keeps only the old key, which can't read anything written from now on.
 */
export async function rotateCircleKey(remote: Remote, s: CircleSession): Promise<{ session: CircleSession; cancelled: number; ringSeq: number }> {
  const cur = s.keyVersion ? s : await withKeyring(remote, s);
  const next = await newAesKey();
  const ridSeed = cur.ridSeed ?? new Uint8Array(await crypto.subtle.exportKey('raw', cur.circleKey));
  const oldKeys = [cur.circleKey, ...(cur.oldKeys ?? [])];
  const version = (cur.keyVersion ?? 1) + 1;

  const sealed: Record<string, string> = {};
  for (const m of await remote.circlePublicKeys(s.circleId)) sealed[m.user_id] = await sealKey(next, m.public_key, `circle:${s.circleId}`);
  const ring: Keyring = { v: version, ridSeed: toB64(ridSeed), old: await Promise.all(oldKeys.map(rawKey)) };
  const { cancelled, seq } = await remote.rotateCircleKey(s.circleId, sealed, `k:${await encryptJson(next, ring, `${s.circleId}:keyring`)}`);
  return { session: { ...s, circleKey: next, oldKeys, ridSeed, keyVersion: version }, cancelled, ringSeq: seq };
}

/**
 * Re-encrypt every shared record that still opens only with an earlier key. Record ids stay the same, so
 * "only me" records, which only their owner can read, stay valid without being touched. Safe to run again
 * after an interruption: rows already on the new key are left alone.
 */
export async function reencryptCircle(remote: Remote, s: CircleSession) {
  const oldKeys = s.oldKeys ?? [];
  if (!oldKeys.length) return;
  // Everything written after the keyring was saved already uses the new key (late writers are re-saved by sync),
  // and the rows re-uploaded here move past it too, so stop there.
  const stopAt = (await remote.getRecord(s.circleId, KEYRING_RID))?.seq ?? Infinity;
  for (let after = 0; ;) {
    const rows = await remote.pull(s.circleId, after, 200);
    const out: { rid: string; ct: string }[] = [];
    let done = rows.length < 200;
    for (const r of rows) {
      if (r.seq >= stopAt) { done = true; break; }
      after = Math.max(after, r.seq);
      if (!r.ct.startsWith('c:')) continue;
      const aad = `${s.circleId}:${r.rid}`;
      try { await decryptJson(s.circleKey, r.ct.slice(2), aad); continue; } catch { /* not on the new key yet */ }
      for (const k of oldKeys) {
        try { out.push({ rid: r.rid, ct: `c:${await encryptJson(s.circleKey, await decryptJson(k, r.ct.slice(2), aad), aad)}` }); break; } catch { /* try an older key */ }
      }
    }
    if (out.length) await remote.push(s.circleId, out);
    if (done) break;
  }
}
