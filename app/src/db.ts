import Dexie, { type Table } from 'dexie';
import type { Entry, Member, Observation, Part, Settings } from './types';
import { defaultSettings } from './lib/defaults';

class IdidDB extends Dexie {
  members!: Table<Member, string>;
  parts!: Table<Part, string>;
  entries!: Table<Entry, string>;
  observations!: Table<Observation, string>;
  settings!: Table<Settings, string>;

  constructor() {
    super('idid');
    this.version(1).stores({
      members: 'id, role, tracked',
      parts: 'id, memberId, archived',
      entries: 'id, subjectId, authorId, occurredAt, loggedAt',
      observations: 'id, entryId, memberId, status',
      settings: 'id',
    });
  }
}

export const db = new IdidDB();

export function uid(): string {
  return crypto.randomUUID();
}

/** Read-only (safe inside liveQuery): stored settings merged over defaults. */
export async function getSettings(): Promise<Settings> {
  const s = await db.settings.get('settings');
  return { ...defaultSettings(), ...s, id: 'settings' };
}

export async function updateSettings(patch: Partial<Settings>) {
  const s = await getSettings();
  await db.settings.put({ ...s, ...patch, id: 'settings' });
}

/** Save an entry and create observation requests for circle members who noticed. */
export async function saveEntry(entry: Entry, opts: { requestObservations: boolean }) {
  await db.transaction('rw', db.entries, db.observations, db.members, async () => {
    await db.entries.put(entry);
    if (!opts.requestObservations || entry.visibility === 'private') return;
    const existing = await db.observations.where('entryId').equals(entry.id).toArray();
    const have = new Set(existing.map((o) => o.memberId));
    for (const mid of entry.noticedByIds) {
      if (have.has(mid) || mid === entry.authorId) continue;
      const m = await db.members.get(mid);
      if (!m?.canObserve) continue;
      await db.observations.put({
        id: uid(), entryId: entry.id, memberId: mid, status: 'requested',
        requestedAt: Date.now(), noticed: [], partIds: [], duration: null, text: '', present: null,
      });
    }
  });
}

export async function deleteEntry(id: string) {
  await db.transaction('rw', db.entries, db.observations, async () => {
    await db.entries.delete(id);
    await db.observations.where('entryId').equals(id).delete();
  });
}

export interface Backup {
  app: 'idid';
  version: 1;
  exportedAt: string;
  members: Member[];
  parts: Part[];
  entries: Entry[];
  observations: Observation[];
  settings?: Partial<Settings>;
}

export async function exportAll(): Promise<Backup> {
  const s = await getSettings();
  const { pinHash: _p, pinSalt: _s, ...safe } = s;
  return {
    app: 'idid', version: 1, exportedAt: new Date().toISOString(),
    members: await db.members.toArray(),
    parts: await db.parts.toArray(),
    entries: await db.entries.toArray(),
    observations: await db.observations.toArray(),
    settings: safe,
  };
}

export async function importAll(b: Backup, mode: 'merge' | 'replace') {
  if (b.app !== 'idid') throw new Error('This file is not an IDID backup.');
  await db.transaction('rw', [db.members, db.parts, db.entries, db.observations, db.settings], async () => {
    if (mode === 'replace') {
      await Promise.all([db.members.clear(), db.parts.clear(), db.entries.clear(), db.observations.clear()]);
    }
    await db.members.bulkPut(b.members ?? []);
    await db.parts.bulkPut(b.parts ?? []);
    await db.entries.bulkPut(b.entries ?? []);
    await db.observations.bulkPut(b.observations ?? []);
    if (mode === 'replace' && b.settings) {
      const cur = await getSettings();
      await db.settings.put({ ...cur, ...b.settings, id: 'settings', pinHash: cur.pinHash, pinSalt: cur.pinSalt, onboarded: true });
    }
  });
}

export async function wipeAll() {
  await db.delete();
  location.reload();
}
