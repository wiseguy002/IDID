/**
 * App-wide data access: one encrypted Store, per-device settings, and the
 * domain helpers screens use (save an entry, export, wipe…).
 */
import { useSyncExternalStore } from 'react';
import { openIdb } from './data/idb';
import { Store, useStoreVersion, type Kind, type KindMap } from './data/store';
import { defaultDevice, defaultPrefs } from './lib/defaults';
import type { DeviceSettings, Entry, Prefs, Settings } from './types';
import { APP_VERSION } from './version';

export const persist = openIdb('idid-secure');
export const store = new Store(persist);

export function uid(): string {
  return crypto.randomUUID();
}

// ---------- Hooks ----------

/** All live (non-deleted) records of a kind, re-rendering on any change. */
export function useAll<K extends Kind>(kind: K): KindMap[K][] {
  useStoreVersion(store);
  return store.all(kind);
}

export function useOne<K extends Kind>(kind: K, id: string | undefined): KindMap[K] | undefined {
  useStoreVersion(store);
  return id ? store.get(kind, id) : undefined;
}

// ---------- Device settings (unencrypted, this device only) ----------

const DEVICE_KEY = 'idid.device';
let device: DeviceSettings = (() => {
  try { return { ...defaultDevice(), ...JSON.parse(localStorage.getItem(DEVICE_KEY) || '{}') }; } catch { return defaultDevice(); }
})();
const deviceListeners = new Set<() => void>();

export function getDevice() { return device; }
export function updateDevice(patch: Partial<DeviceSettings>) {
  device = { ...device, ...patch };
  try { localStorage.setItem(DEVICE_KEY, JSON.stringify(device)); } catch { /* storage unavailable */ }
  for (const l of deviceListeners) l();
}
export function subscribeDevice(fn: () => void) { deviceListeners.add(fn); return () => { deviceListeners.delete(fn); }; }
export function useDevice() {
  return useSyncExternalStore((fn) => { deviceListeners.add(fn); return () => { deviceListeners.delete(fn); }; }, getDevice);
}

// ---------- Shared prefs (encrypted, synced) ----------

export function getPrefs(): Prefs {
  return { ...defaultPrefs(), ...store.get('prefs', 'prefs') };
}
export async function updatePrefs(patch: Partial<Prefs>) {
  await store.put('prefs', { ...getPrefs(), ...patch, id: 'prefs' });
}

export function useSettings(): Settings {
  const d = useDevice();
  useStoreVersion(store);
  return { ...getPrefs(), ...d };
}

/** Update either kind of setting; fields are routed to the right place. */
export async function updateSettings(patch: Partial<Settings>) {
  const prefKeys = Object.keys(defaultPrefs());
  const p: Record<string, unknown> = {}, d: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(patch)) (prefKeys.includes(k) ? p : d)[k] = v;
  if (Object.keys(d).length) updateDevice(d as Partial<DeviceSettings>);
  if (Object.keys(p).length) await updatePrefs(p as Partial<Prefs>);
}

// ---------- Domain helpers ----------

/** Save an entry and create observation requests for circle members who noticed. */
export async function saveEntry(entry: Entry, opts: { requestObservations: boolean }) {
  await store.put('entries', entry);
  if (!opts.requestObservations || entry.visibility === 'private') return [];
  const have = new Set(store.all('observations').filter((o) => o.entryId === entry.id).map((o) => o.memberId));
  const created: string[] = [];
  for (const mid of entry.noticedByIds) {
    if (have.has(mid) || mid === entry.authorId) continue;
    const m = store.get('members', mid);
    if (!m?.canObserve) continue;
    await store.put('observations', {
      id: uid(), entryId: entry.id, memberId: mid, status: 'requested',
      requestedAt: Date.now(), noticed: [], partIds: [], duration: null, text: '', present: null,
    });
    created.push(mid);
  }
  return created;
}

export async function deleteEntry(id: string) {
  for (const o of store.all('observations').filter((o) => o.entryId === id)) await store.remove('observations', o.id);
  await store.remove('entries', id);
}

export interface Backup {
  app: 'idid';
  /** Backup file format version (separate from the app version). */
  version: 2;
  appVersion?: string;
  exportedAt: string;
  members: KindMap['members'][];
  parts: KindMap['parts'][];
  entries: KindMap['entries'][];
  observations: KindMap['observations'][];
  appointments: KindMap['appointments'][];
  contacts?: KindMap['contacts'][];
  checkins?: KindMap['checkins'][];
  activity?: KindMap['activity'][];
  safety?: KindMap['safety'][];
  board?: KindMap['board'][];
  body?: KindMap['body'][];
  meds?: KindMap['meds'][];
  comfort?: KindMap['comfort'][];
  prep?: KindMap['prep'][];
  prefs?: Prefs;
}

export function exportAll(): Backup {
  return {
    app: 'idid', version: 2, appVersion: APP_VERSION, exportedAt: new Date().toISOString(),
    members: store.all('members'), parts: store.all('parts'), entries: store.all('entries'),
    observations: store.all('observations'), appointments: store.all('appointments'), contacts: store.all('contacts'), checkins: store.all('checkins'), activity: store.all('activity'), safety: store.all('safety'), board: store.all('board'), body: store.all('body'),
    meds: store.all('meds'), comfort: store.all('comfort'), prep: store.all('prep'), prefs: getPrefs(),
  };
}

export async function importAll(b: Partial<Backup> & { app: string }, mode: 'merge' | 'replace') {
  if (b.app !== 'idid') throw new Error('This file is not an iDID backup.');
  const kinds = ['members', 'parts', 'entries', 'observations', 'appointments', 'contacts', 'checkins', 'activity', 'safety', 'board', 'body', 'meds', 'comfort', 'prep'] as const;
  if (mode === 'replace') {
    for (const k of kinds) for (const r of store.all(k)) await store.remove(k, r.id);
  }
  for (const k of kinds) for (const r of (b[k] ?? []) as { id: string }[]) await store.put(k, r as never);
  if (b.prefs) await updatePrefs(b.prefs);
}

export async function wipeAll() {
  store.lock();
  await persist.destroy();
  try { localStorage.removeItem(DEVICE_KEY); localStorage.removeItem('idid.checkin.dismissed'); localStorage.removeItem('idid.account'); localStorage.removeItem('idid.sample'); } catch { /* ignore */ }
  location.reload();
}

// ---------- Explore: activity, facts, badges ----------

import { emptyActivity, recordEvent, type EventName, type Facts } from './lib/progress';

export function getActivity(memberId: string) {
  return store.get('activity', memberId) ?? emptyActivity(memberId);
}

/** Count something the person did (only stored inside their encrypted journal). */
export async function track(memberId: string | undefined, e: EventName) {
  if (!memberId || !store.unlocked) return;
  await store.put('activity', recordEvent(getActivity(memberId), e));
}

export async function patchActivity(memberId: string, patch: Partial<KindMap['activity']>) {
  await store.put('activity', { ...getActivity(memberId), ...patch, id: memberId });
}

/** What a person has done, worked out from their data. */
export function factsFor(memberId: string, extra: { online: boolean; notifications: boolean }): Facts {
  const entries = store.all('entries').filter((e) => e.subjectId === memberId || e.authorId === memberId);
  const checkins = store.all('checkins').filter((c) => c.memberId === memberId);
  const me = store.get('members', memberId);
  return {
    entries: entries.length,
    reflections: store.all('entries').reduce((n, e) => n + e.followUps.filter((f) => f.memberId === memberId).length, 0),
    parts: store.all('parts').filter((p) => p.memberId === memberId).length,
    circlePeople: store.all('members').filter((m) => m.id !== memberId).length,
    observationsGiven: store.all('observations').filter((o) => o.memberId === memberId && o.status === 'done').length,
    checkins: checkins.length,
    helped: checkins.filter((c) => c.helped).length,
    rituals: me?.rituals?.length ?? 0,
    supportProfile: !!me?.support?.zip,
    safetyPlan: !!store.get('safety', `safety:${memberId}`),
    boardNotes: store.all('board').filter((n) => n.memberId === memberId).length,
    bodyDays: store.all('body').filter((b) => b.memberId === memberId).length,
    meds: store.all('meds').filter((m) => m.memberId === memberId).length,
    comfortItems: store.all('comfort').filter((c) => c.memberId === memberId).length,
    preps: store.all('prep').filter((p) => p.memberId === memberId).length,
    checkOnSent: store.all('alerts').filter((a) => a.fromMemberId === memberId).length,
    contacts: store.all('contacts').filter((c) => c.memberId === memberId).length,
    appointments: store.all('appointments').filter((a) => !a.memberIds.length || a.memberIds.includes(memberId)).length,
    careShares: store.all('careShares').filter((c) => c.subjectId === memberId).length,
    invitesSent: store.all('invitations').filter((i) => i.createdBy === memberId).length,
    ...extra,
  };
}
