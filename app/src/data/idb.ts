/** Minimal promise wrapper over IndexedDB: three object stores, string keys. */
export type StoreName = 'kv' | 'records' | 'outbox';

export interface Persist {
  get<T>(store: StoreName, key: string): Promise<T | undefined>;
  getAll<T>(store: StoreName): Promise<T[]>;
  put(store: StoreName, key: string, value: unknown): Promise<void>;
  del(store: StoreName, key: string): Promise<void>;
  clear(store: StoreName): Promise<void>;
  destroy(): Promise<void>;
}

const req = <T>(r: IDBRequest<T>) => new Promise<T>((res, rej) => { r.onsuccess = () => res(r.result); r.onerror = () => rej(r.error); });

export function openIdb(name = 'idid-secure'): Persist {
  let dbp: Promise<IDBDatabase> | null = null;
  const db = () => (dbp ??= new Promise((res, rej) => {
    const r = indexedDB.open(name, 1);
    r.onupgradeneeded = () => { for (const s of ['kv', 'records', 'outbox']) r.result.createObjectStore(s); };
    r.onsuccess = () => res(r.result);
    r.onerror = () => rej(r.error);
  }));
  const tx = async (s: StoreName, mode: IDBTransactionMode) => (await db()).transaction(s, mode).objectStore(s);
  return {
    async get(s, k) { return req((await tx(s, 'readonly')).get(k)); },
    async getAll(s) { return req((await tx(s, 'readonly')).getAll()); },
    async put(s, k, v) { await req((await tx(s, 'readwrite')).put(v, k)); },
    async del(s, k) { await req((await tx(s, 'readwrite')).delete(k)); },
    async clear(s) { await req((await tx(s, 'readwrite')).clear()); },
    async destroy() {
      if (dbp) (await dbp).close();
      dbp = null;
      await new Promise<void>((res) => { const r = indexedDB.deleteDatabase(name); r.onsuccess = r.onerror = r.onblocked = () => res(); });
    },
  };
}

export function memoryPersist(): Persist {
  const m: Record<StoreName, Map<string, unknown>> = { kv: new Map(), records: new Map(), outbox: new Map() };
  const clone = <T>(v: T) => (v === undefined ? v : structuredClone(v));
  return {
    async get(s, k) { return clone(m[s].get(k)) as never; },
    async getAll(s) { return [...m[s].values()].map(clone) as never; },
    async put(s, k, v) { m[s].set(k, clone(v)); },
    async del(s, k) { m[s].delete(k); },
    async clear(s) { m[s].clear(); },
    async destroy() { for (const s of Object.values(m)) s.clear(); },
  };
}
