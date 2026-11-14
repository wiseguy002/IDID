/**
 * The app's data store. Everything lives decrypted in memory only while the app
 * is unlocked; on disk each record is a separate AES-GCM ciphertext.
 *
 * Every change is also added to an outbox so the sync engine can upload it.
 * Deletions are kept as tombstones so they can sync too.
 */
import { useSyncExternalStore } from 'react';
import type { Activity, Appointment, BoardNote, BodyDay, CheckIn, CheckOnAlert, ComfortItem, Medication, SafetyPlan, SessionPrep, Entry, Member, Observation, Part, Prefs, SupportContact, Invitation, CareShare, FrontLog, VoiceNote, Reflection } from '../types';
import { decryptJson, encryptJson } from './crypto';
import type { Persist } from './idb';

export interface KindMap {
  members: Member;
  parts: Part;
  entries: Entry;
  observations: Observation;
  appointments: Appointment;
  contacts: SupportContact;
  checkins: CheckIn;
  activity: Activity;
  safety: SafetyPlan;
  board: BoardNote;
  alerts: CheckOnAlert;
  body: BodyDay;
  meds: Medication;
  comfort: ComfortItem;
  prep: SessionPrep;
  prefs: Prefs;
  invitations: Invitation;
  careShares: CareShare;
  fronts: FrontLog;
  voice: VoiceNote;
  reflections: Reflection;
}
export type Kind = keyof KindMap;
export const KINDS: Kind[] = ['members', 'parts', 'entries', 'observations', 'appointments', 'contacts', 'checkins', 'activity', 'safety', 'board', 'alerts', 'body', 'meds', 'comfort', 'prep', 'prefs', 'invitations', 'careShares', 'fronts', 'voice', 'reflections'];

/** Kinds that are always encrypted with the person's own key when synced (never readable by the circle). */
export const ALWAYS_PRIVATE: Kind[] = ['board', 'body', 'meds', 'comfort', 'prep', 'checkins', 'activity', 'careShares', 'fronts', 'voice', 'reflections'];

export interface Envelope<T = unknown> {
  kind: Kind;
  id: string;
  /** Last change, ms since epoch — used for last-write-wins merges. */
  updatedAt: number;
  deleted: boolean;
  data: T | null;
}

interface DiskRecord { box: string }

const rkey = (kind: Kind, id: string) => `${kind}:${id}`;

export class Store {
  private key: CryptoKey | null = null;
  private recs = new Map<string, Envelope>();
  private cache = new Map<Kind, unknown[]>();
  private listeners = new Set<() => void>();
  private version = 0;
  /** Called after any local change (used to trigger sync). */
  onLocalChange: (() => void) | null = null;

  private persist: Persist;
  constructor(persist: Persist) { this.persist = persist; }

  get unlocked() { return !!this.key; }
  getVersion = () => this.version;
  subscribe = (fn: () => void) => { this.listeners.add(fn); return () => { this.listeners.delete(fn); }; };
  private emit() { this.version++; this.cache.clear(); for (const l of this.listeners) l(); }

  async open(key: CryptoKey) {
    this.key = key;
    this.recs.clear();
    const rows = await this.persist.getAll<DiskRecord & { k: string }>('records');
    for (const r of rows) {
      try {
        const env = await decryptJson<Envelope>(key, r.box, r.k);
        this.recs.set(r.k, env);
      } catch {
        // A record that fails authentication is skipped rather than crashing the app.
        console.warn('Skipped unreadable record');
      }
    }
    this.emit();
  }

  /** Encrypt a small private value with the device data key (e.g. account keys). */
  async sealLocal(name: string, value: unknown) {
    if (!this.key) throw new Error('Store is locked');
    await this.persist.put('kv', `sealed:${name}`, await encryptJson(this.key, value, `sealed:${name}`));
  }
  async openLocal<T>(name: string): Promise<T | null> {
    if (!this.key) return null;
    const box = await this.persist.get<string>('kv', `sealed:${name}`);
    if (!box) return null;
    try { return await decryptJson<T>(this.key, box, `sealed:${name}`); } catch { return null; }
  }
  async dropLocal(name: string) { await this.persist.del('kv', `sealed:${name}`); }

  lock() { this.key = null; this.recs.clear(); this.emit(); }

  all<K extends Kind>(kind: K): KindMap[K][] {
    let c = this.cache.get(kind);
    if (!c) {
      c = [...this.recs.values()].filter((e) => e.kind === kind && !e.deleted).map((e) => e.data);
      this.cache.set(kind, c);
    }
    return c as KindMap[K][];
  }

  get<K extends Kind>(kind: K, id: string): KindMap[K] | undefined {
    const e = this.recs.get(rkey(kind, id));
    return e && !e.deleted ? (e.data as KindMap[K]) : undefined;
  }

  envelope(kind: Kind, id: string) { return this.recs.get(rkey(kind, id)); }
  envelopes() { return [...this.recs.values()]; }

  private async write(env: Envelope, local: boolean) {
    if (!this.key) throw new Error('Store is locked');
    const k = rkey(env.kind, env.id);
    this.recs.set(k, env);
    this.emit();
    await this.persist.put('records', k, { k, box: await encryptJson(this.key, env, k) });
    if (local) {
      await this.persist.put('outbox', k, { kind: env.kind, id: env.id, at: env.updatedAt });
      this.onLocalChange?.();
    }
  }

  async put<K extends Kind>(kind: K, value: KindMap[K] & { id: string }) {
    await this.write({ kind, id: value.id, updatedAt: Date.now(), deleted: false, data: value }, true);
  }

  async putMany<K extends Kind>(kind: K, values: (KindMap[K] & { id: string })[]) {
    for (const v of values) await this.put(kind, v);
  }

  async patch<K extends Kind>(kind: K, id: string, changes: Partial<KindMap[K]>) {
    const cur = this.get(kind, id);
    if (!cur) return;
    await this.put(kind, { ...cur, ...changes } as KindMap[K] & { id: string });
  }

  async remove(kind: Kind, id: string) {
    if (!this.recs.has(rkey(kind, id))) return;
    await this.write({ kind, id, updatedAt: Date.now(), deleted: true, data: null }, true);
  }

  /** Merge a change that came from another device. Last write wins. Returns true if applied. */
  async applyRemote(env: Envelope): Promise<boolean> {
    const cur = this.recs.get(rkey(env.kind, env.id));
    if (cur && cur.updatedAt >= env.updatedAt) return false;
    await this.write(env, false);
    return true;
  }

  async outbox(): Promise<{ kind: Kind; id: string; at: number }[]> {
    return this.persist.getAll('outbox');
  }

  /** Remove an outbox item, unless the record changed again after `at`. */
  async clearOutbox(kind: Kind, id: string, at: number) {
    const k = rkey(kind, id);
    const cur = await this.persist.get<{ at: number }>('outbox', k);
    if (cur && cur.at <= at) await this.persist.del('outbox', k);
  }

  /** Queue one record to be uploaded again (for example, to re-encrypt it with a new circle key). */
  async requeue(kind: Kind, id: string) {
    const e = this.recs.get(rkey(kind, id));
    if (!e) return;
    await this.persist.put('outbox', rkey(kind, id), { kind, id, at: e.updatedAt });
    this.onLocalChange?.();
  }

  /** Queue every record for upload (used when a circle is first connected). */
  async queueAll() {
    for (const e of this.recs.values()) await this.persist.put('outbox', rkey(e.kind, e.id), { kind: e.kind, id: e.id, at: e.updatedAt });
    this.onLocalChange?.();
  }
}

export function useStoreVersion(store: Store) {
  return useSyncExternalStore(store.subscribe, store.getVersion);
}
