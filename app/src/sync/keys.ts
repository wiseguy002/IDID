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
  newIdentity, openSealedKey, randomBytes, sealKey, toB64, unwrapAesKey, wrapAesKey, type Identity,
} from '../data/crypto';
import type { Remote } from './remote';

export interface AccountKeys { userId: string; identity: Identity; personalKey: CryptoKey }
export interface CircleSession extends AccountKeys { circleId: string; circleKey: CryptoKey }

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
  return { ...acct, circleId, circleKey };
}

export async function openCircle(remote: Remote, acct: AccountKeys, circleId?: string): Promise<CircleSession | null> {
  const ms = await remote.myMemberships();
  // Without a specific circle, open the one this account joined most recently.
  const newest = [...ms].sort((a, b) => (b.created_at ?? '').localeCompare(a.created_at ?? ''))[0];
  const m = circleId ? ms.find((x) => x.circle_id === circleId) : newest;
  if (!m) return null;
  for (const aad of [`circle:${m.circle_id}`, 'circle:new']) {
    try { return { ...acct, circleId: m.circle_id, circleKey: await openSealedKey(m.sealed_circle_key, acct.identity, aad) }; } catch { /* try next */ }
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
  return { ...acct, circleId, circleKey };
}

// ---------- Local cache (sealed with the device data key) ----------

export interface SavedSession { userId: string; circleId: string | null; email: string; publicJwk: JsonWebKey; priv: string; personal: string; circle: string | null }

const raw = async (k: CryptoKey) => toB64(new Uint8Array(await crypto.subtle.exportKey('raw', k)));
const aes = (b: string) => crypto.subtle.importKey('raw', fromB64(b), { name: 'AES-GCM' }, true, ['encrypt', 'decrypt']);

export async function serialiseSession(s: AccountKeys & { circleId?: string | null; circleKey?: CryptoKey | null }, email: string): Promise<SavedSession> {
  return {
    userId: s.userId, email, circleId: s.circleId ?? null, publicJwk: s.identity.publicJwk,
    priv: toB64(new Uint8Array(await crypto.subtle.exportKey('pkcs8', s.identity.privateKey))),
    personal: await raw(s.personalKey), circle: s.circleKey ? await raw(s.circleKey) : null,
  };
}

export async function restoreSession(v: SavedSession): Promise<AccountKeys & { circleId: string | null; circleKey: CryptoKey | null }> {
  const privateKey = await crypto.subtle.importKey('pkcs8', fromB64(v.priv), { name: 'ECDH', namedCurve: 'P-256' }, true, ['deriveKey']);
  return {
    userId: v.userId, identity: { publicJwk: v.publicJwk, privateKey }, personalKey: await aes(v.personal),
    circleId: v.circleId, circleKey: v.circle ? await aes(v.circle) : null,
  };
}
