/**
 * Bring a journal to a new device for someone who already uses iDID with an online circle.
 * Kept free of app globals so it can be tested against the fake server.
 */
import type { Persist } from '../data/idb';
import type { Store } from '../data/store';
import { createVault, hasVault } from '../data/vault';
import { SyncEngine, type SyncState } from './engine';
import { openAccount, openCircle, type CircleSession } from './keys';
import type { Remote } from './remote';

export type RestoreOutcome =
  | { result: 'ok'; session: CircleSession; recoveryCode: string; meId: string | null; entries: number }
  | { result: 'no-account' | 'wrong-passphrase' | 'no-circle' };

/**
 * Open the account keys with the passphrase, then create this device's encrypted journal with the
 * same passphrase and pull everything from the circle. Nothing is written on this device until the
 * passphrase is confirmed and there is a circle to restore from. `beforeOpen` runs just before the
 * new journal unlocks, so the caller can take ownership of the session first.
 */
export async function restoreJournal(opts: {
  remote: Remote; persist: Persist; store: Store; passphrase: string;
  syncState: { load(): Promise<SyncState>; save(v: SyncState): Promise<void> };
  beforeOpen?: (session: CircleSession) => void;
}): Promise<RestoreOutcome> {
  const { remote, persist, store, passphrase, syncState } = opts;
  if (await hasVault(persist)) throw new Error('This device already has a journal.');
  const acct = await openAccount(remote, passphrase);
  if (acct === null) return { result: 'no-account' };
  if (acct === 'wrong') return { result: 'wrong-passphrase' };
  const session = await openCircle(remote, acct);
  if (!session) return { result: 'no-circle' };
  opts.beforeOpen?.(session);
  const { dataKey, recoveryCode } = await createVault(persist, passphrase);
  await store.open(dataKey);
  await new SyncEngine(store, remote, session, syncState).pullOnce();
  const me = store.all('members').find((m) => m.userId === acct.userId);
  return { result: 'ok', session, recoveryCode, meId: me?.id ?? null, entries: store.all('entries').length };
}
