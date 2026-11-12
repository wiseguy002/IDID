/**
 * All cryptography for iDID, built only on the browser's Web Crypto API.
 *
 * - Data at rest and in transit is AES-GCM-256 with a random 96-bit IV per message
 *   and additional authenticated data (AAD) binding each ciphertext to its record.
 * - Passphrases become keys through PBKDF2-SHA-256 (600k iterations).
 * - Each account has an ECDH P-256 identity key pair; symmetric keys are shared
 *   with a person by sealing them to their public key (ephemeral ECDH + AES-GCM).
 */
const subtle = globalThis.crypto.subtle;
const enc = new TextEncoder();
const dec = new TextDecoder();

export const PBKDF2_ITERATIONS = 600_000;

export function randomBytes(n: number): Uint8Array<ArrayBuffer> {
  return globalThis.crypto.getRandomValues(new Uint8Array(n));
}

export function toB64(buf: ArrayBuffer | Uint8Array): string {
  const bytes = buf instanceof Uint8Array ? buf : new Uint8Array(buf);
  let s = '';
  for (let i = 0; i < bytes.length; i++) s += String.fromCharCode(bytes[i]);
  return btoa(s).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

export function fromB64(s: string): Uint8Array<ArrayBuffer> {
  const pad = s.replace(/-/g, '+').replace(/_/g, '/') + '==='.slice((s.length + 3) % 4);
  const bin = atob(pad);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}

/** A fresh AES-GCM-256 key. Extractable so it can be wrapped for storage or sharing. */
export function newAesKey(): Promise<CryptoKey> {
  return subtle.generateKey({ name: 'AES-GCM', length: 256 }, true, ['encrypt', 'decrypt']);
}

export async function deriveKeyFromPassphrase(passphrase: string, salt: Uint8Array<ArrayBuffer>, iterations = PBKDF2_ITERATIONS): Promise<CryptoKey> {
  const base = await subtle.importKey('raw', enc.encode(passphrase.normalize('NFKC')), 'PBKDF2', false, ['deriveKey']);
  return subtle.deriveKey({ name: 'PBKDF2', salt, iterations, hash: 'SHA-256' }, base, { name: 'AES-GCM', length: 256 }, false, ['encrypt', 'decrypt']);
}

/** For high-entropy secrets (recovery codes, invite secrets): HKDF is enough. */
export async function deriveKeyFromSecret(secret: Uint8Array<ArrayBuffer>, info: string): Promise<CryptoKey> {
  const base = await subtle.importKey('raw', secret, 'HKDF', false, ['deriveKey']);
  return subtle.deriveKey({ name: 'HKDF', hash: 'SHA-256', salt: new Uint8Array(32), info: enc.encode(info) }, base, { name: 'AES-GCM', length: 256 }, false, ['encrypt', 'decrypt']);
}

/** Encrypt bytes → "v1.<iv>.<ciphertext>" */
export async function encryptBytes(key: CryptoKey, data: Uint8Array<ArrayBuffer>, aad = ''): Promise<string> {
  const iv = randomBytes(12);
  const ct = await subtle.encrypt({ name: 'AES-GCM', iv, additionalData: enc.encode(aad) }, key, data);
  return `v1.${toB64(iv)}.${toB64(ct)}`;
}

export async function decryptBytes(key: CryptoKey, box: string, aad = ''): Promise<Uint8Array<ArrayBuffer>> {
  const [v, iv, ct] = box.split('.');
  if (v !== 'v1' || !iv || !ct) throw new Error('Unrecognised ciphertext format');
  const pt = await subtle.decrypt({ name: 'AES-GCM', iv: fromB64(iv), additionalData: enc.encode(aad) }, key, fromB64(ct));
  return new Uint8Array(pt);
}

export async function encryptJson(key: CryptoKey, value: unknown, aad = ''): Promise<string> {
  return encryptBytes(key, enc.encode(JSON.stringify(value)), aad);
}

export async function decryptJson<T>(key: CryptoKey, box: string, aad = ''): Promise<T> {
  return JSON.parse(dec.decode(await decryptBytes(key, box, aad))) as T;
}

/** Protect an AES key with another key (the "key-encryption key"). */
export async function wrapAesKey(key: CryptoKey, kek: CryptoKey, aad = 'key'): Promise<string> {
  return encryptBytes(kek, new Uint8Array(await subtle.exportKey('raw', key)), aad);
}

export async function unwrapAesKey(box: string, kek: CryptoKey, aad = 'key'): Promise<CryptoKey> {
  const raw = await decryptBytes(kek, box, aad);
  return subtle.importKey('raw', raw, { name: 'AES-GCM' }, true, ['encrypt', 'decrypt']);
}

// ---------- Identity keys (sharing keys between people) ----------

export interface Identity { publicJwk: JsonWebKey; privateKey: CryptoKey }

export async function newIdentity(): Promise<Identity> {
  const kp = await subtle.generateKey({ name: 'ECDH', namedCurve: 'P-256' }, true, ['deriveKey']);
  return { publicJwk: await subtle.exportKey('jwk', kp.publicKey), privateKey: kp.privateKey };
}

export async function exportPrivate(id: Identity, kek: CryptoKey, aad = 'identity'): Promise<string> {
  return encryptBytes(kek, new Uint8Array(await subtle.exportKey('pkcs8', id.privateKey)), aad);
}

export async function importPrivate(box: string, publicJwk: JsonWebKey, kek: CryptoKey, aad = 'identity'): Promise<Identity> {
  const pk = await decryptBytes(kek, box, aad);
  const privateKey = await subtle.importKey('pkcs8', pk, { name: 'ECDH', namedCurve: 'P-256' }, true, ['deriveKey']);
  return { publicJwk, privateKey };
}

async function ecdhKey(priv: CryptoKey, pubJwk: JsonWebKey) {
  const pub = await subtle.importKey('jwk', pubJwk, { name: 'ECDH', namedCurve: 'P-256' }, false, []);
  return subtle.deriveKey({ name: 'ECDH', public: pub }, priv, { name: 'AES-GCM', length: 256 }, false, ['encrypt', 'decrypt']);
}

/** Seal an AES key so only the holder of `recipientPublic`'s private key can open it. */
export async function sealKey(key: CryptoKey, recipientPublic: JsonWebKey, aad: string): Promise<string> {
  const eph = await subtle.generateKey({ name: 'ECDH', namedCurve: 'P-256' }, true, ['deriveKey']);
  const shared = await ecdhKey(eph.privateKey, recipientPublic);
  const box = await wrapAesKey(key, shared, aad);
  const epk = await subtle.exportKey('jwk', eph.publicKey);
  return `s1.${toB64(enc.encode(JSON.stringify({ x: epk.x, y: epk.y })))}.${box}`;
}

export async function openSealedKey(sealed: string, me: Identity, aad: string): Promise<CryptoKey> {
  const [v, epkB64, ...rest] = sealed.split('.');
  if (v !== 's1') throw new Error('Unrecognised sealed key');
  const { x, y } = JSON.parse(dec.decode(fromB64(epkB64)));
  const shared = await ecdhKey(me.privateKey, { kty: 'EC', crv: 'P-256', x, y, ext: true });
  return unwrapAesKey(rest.join('.'), shared, aad);
}

// ---------- Human-friendly codes ----------

const B32 = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // no I, O, 0, 1

/** 25 characters from a 32-letter alphabet ≈ 125 bits, shown as 5 groups of 5. */
export function newRecoveryCode(): string {
  const bytes = randomBytes(25);
  const chars = [...bytes].map((b) => B32[b % 32]).join('');
  return chars.match(/.{5}/g)!.join('-');
}

export function normaliseCode(code: string): string {
  return code.toUpperCase().replace(/[^A-Z0-9]/g, '');
}

export function codeToSecret(code: string): Uint8Array<ArrayBuffer> {
  return enc.encode(normaliseCode(code));
}
