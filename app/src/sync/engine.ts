/**
 * Two-way sync between the local encrypted store and the circle's server records.
 * Each record is re-encrypted for the server: circle key for shared data,
 * personal key for "only me" entries. The server sees opaque ids and ciphertext.
 */
import { decryptJson, encryptJson } from '../data/crypto';
import { ALWAYS_PRIVATE, type Envelope, type Store } from '../data/store';
import type { CheckOnAlert, Observation } from '../types';
import type { CircleSession } from './keys';
import type { Remote, ReminderRow } from './remote';

const PAGE = 200;

export interface SyncState { lastSeq: number }
export type SyncStatus = 'idle' | 'syncing' | 'offline' | 'error';

export class SyncEngine {
  private macKey: Promise<CryptoKey>;
  private running: Promise<void> | null = null;
  private again = false;
  private unsub: (() => void) | null = null;
  private timer: ReturnType<typeof setTimeout> | null = null;
  status: SyncStatus = 'idle';
  lastError = '';
  lastSyncedAt = 0;
  onStatus: (() => void) | null = null;
  /** Called with the ids of members on this device so observation requests notify the right accounts. */
  myMemberIds: () => string[] = () => [];

  private store: Store;
  private remote: Remote;
  private s: CircleSession;
  private state: { load(): Promise<SyncState>; save(v: SyncState): Promise<void> };

  constructor(store: Store, remote: Remote, s: CircleSession, state: { load(): Promise<SyncState>; save(v: SyncState): Promise<void> }) {
    this.store = store; this.remote = remote; this.s = s; this.state = state;
    this.macKey = crypto.subtle.exportKey('raw', s.circleKey).then(async (raw) => {
      const ikm = await crypto.subtle.importKey('raw', raw, 'HKDF', false, ['deriveKey']);
      return crypto.subtle.deriveKey({ name: 'HKDF', hash: 'SHA-256', salt: new Uint8Array(32), info: new TextEncoder().encode('idid-rid') }, ikm, { name: 'HMAC', hash: 'SHA-256', length: 256 }, false, ['sign']);
    });
  }

  async rid(kind: string, id: string) {
    const sig = await crypto.subtle.sign('HMAC', await this.macKey, new TextEncoder().encode(`${kind}:${id}`));
    return [...new Uint8Array(sig).slice(0, 20)].map((b) => b.toString(16).padStart(2, '0')).join('');
  }

  /** "Only me" entries, private safety plans, and personal kinds (board, body, meds, comfort, prep…) use the personal key. */
  private isPrivate(env: Envelope) {
    if (env.deleted) return false;
    if (ALWAYS_PRIVATE.includes(env.kind)) return true;
    const v = (env.data as { visibility?: string } | null)?.visibility;
    return (env.kind === 'entries' || env.kind === 'safety') && v === 'private';
  }

  async encode(env: Envelope): Promise<{ rid: string; ct: string }> {
    const rid = await this.rid(env.kind, env.id);
    const aad = `${this.s.circleId}:${rid}`;
    const ct = this.isPrivate(env) ? `p:${this.s.userId}:${await encryptJson(this.s.personalKey, env, aad)}` : `c:${await encryptJson(this.s.circleKey, env, aad)}`;
    return { rid, ct };
  }

  async decode(rid: string, ct: string): Promise<Envelope | null> {
    const aad = `${this.s.circleId}:${rid}`;
    try {
      if (ct.startsWith('c:')) return await decryptJson<Envelope>(this.s.circleKey, ct.slice(2), aad);
      if (ct.startsWith(`p:${this.s.userId}:`)) return await decryptJson<Envelope>(this.s.personalKey, ct.slice(3 + this.s.userId.length), aad);
      return null; // someone else's private entry
    } catch { return null; }
  }

  /** Run push+pull, coalescing overlapping calls. */
  sync(): Promise<void> {
    if (this.running) { this.again = true; return this.running; }
    this.running = (async () => {
      do {
        this.again = false;
        this.setStatus('syncing');
        try {
          if (!this.readOnly) await this.pushOnce();
          await this.pullOnce();
          this.lastSyncedAt = Date.now();
          this.setStatus('idle');
        } catch (e) {
          this.lastError = e instanceof Error ? e.message : String(e);
          this.setStatus(typeof navigator !== 'undefined' && navigator.onLine === false ? 'offline' : 'error');
          break;
        }
      } while (this.again);
    })().finally(() => { this.running = null; });
    return this.running;
  }

  /** View-only members: download, never upload (the server would refuse it anyway). */
  readOnly = false;

  private setStatus(s: SyncStatus) { this.status = s; this.onStatus?.(); }

  async pushOnce() {
    const items = await this.store.outbox();
    const mine = new Set(this.myMemberIds());
    for (let i = 0; i < items.length; i += 50) {
      const batch = items.slice(i, i + 50);
      const rows: { rid: string; ct: string }[] = [];
      const done: typeof batch = [];
      const notify: ReminderRow[] = [];
      for (const it of batch) {
        const env = this.store.envelope(it.kind, it.id);
        if (!env) { done.push(it); continue; }
        rows.push(await this.encode(env));
        done.push(it);
        // A new observation request: wake the person it's for (if they have an account).
        if (env.kind === 'observations' && !env.deleted) {
          const o = env.data as Observation;
          const target = this.store.get('members', o.memberId);
          const entry = this.store.get('entries', o.entryId);
          if (o.status === 'requested' && target?.userId && target.userId !== this.s.userId && entry && mine.has(entry.authorId)) {
            notify.push({ user_id: target.userId, kind: 'observation', fire_at: new Date().toISOString(), tag: `obs-${o.id}` });
          }
        }
        // A new "Check on me": wake each chosen person who has an account.
        if (env.kind === 'alerts' && !env.deleted) {
          const al = env.data as CheckOnAlert;
          if (!al.resolvedAt && mine.has(al.fromMemberId) && Date.now() - al.createdAt < 3600000) {
            for (const mid of al.toMemberIds) {
              const t = this.store.get('members', mid);
              if (t?.userId && t.userId !== this.s.userId) notify.push({ user_id: t.userId, kind: 'checkon', fire_at: new Date().toISOString(), tag: `checkon-${al.id}-${mid}` });
            }
          }
        }
      }
      await this.remote.push(this.s.circleId, rows);
      for (const it of done) await this.store.clearOutbox(it.kind, it.id, it.at);
      for (const n of notify) await this.remote.addReminder(n).catch(() => undefined);
    }
  }

  async pullOnce() {
    const st = await this.state.load();
    let last = st.lastSeq;
    for (;;) {
      const rows = await this.remote.pull(this.s.circleId, last, PAGE);
      for (const r of rows) {
        const env = await this.decode(r.rid, r.ct);
        if (env && (await this.rid(env.kind, env.id)) === r.rid) await this.store.applyRemote(env);
        last = Math.max(last, r.seq);
      }
      await this.state.save({ lastSeq: last });
      if (rows.length < PAGE) break;
    }
  }

  start() {
    this.unsub = this.remote.subscribe(this.s.circleId, () => this.soon(300));
    this.store.onLocalChange = () => this.soon(1500);
    const iv = setInterval(() => this.sync(), 60000);
    const online = () => this.sync();
    if (typeof window !== 'undefined') window.addEventListener('online', online);
    this.sync();
    return () => {
      this.unsub?.(); clearInterval(iv); if (this.timer) clearTimeout(this.timer);
      this.store.onLocalChange = null;
      if (typeof window !== 'undefined') window.removeEventListener('online', online);
    };
  }

  private soon(ms: number) {
    if (this.timer) clearTimeout(this.timer);
    this.timer = setTimeout(() => this.sync(), ms);
  }
}
