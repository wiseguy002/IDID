/**
 * The online circle, as seen by the UI: sign-in, account keys, joining or creating
 * a circle, invites, the running sync engine, and server-side reminders for push.
 */
import { useSyncExternalStore } from 'react';
import { getDevice, persist, store, subscribeDevice } from '../db';
import { unlockVault } from '../data/vault';
import { checkInTimes, remindersBetween } from '../lib/schedule';
import { SyncEngine } from './engine';
import { createAccount, createCircle, rewrapAccount, joinWithInvite, makeInvite, openAccount, openCircle, restoreSession, serialiseSession, type AccountKeys, type CircleSession } from './keys';
import type { Remote, ReminderRow } from './remote';
import { cloudConfigured, supabase, SupabaseRemote } from './supabase';

export type Phase =
  | 'off'            // cloud not configured in this build
  | 'signed-out'
  | 'needs-keys'     // signed in; must unlock (or create) account keys with the passphrase
  | 'needs-circle'   // keys ready; no circle yet
  | 'connected';

interface State { phase: Phase; email: string; circleId: string | null; status: SyncEngine['status']; lastSyncedAt: number; error: string }

let state: State = { phase: cloudConfigured() ? 'signed-out' : 'off', email: '', circleId: null, status: 'idle', lastSyncedAt: 0, error: '' };
const listeners = new Set<() => void>();
const set = (p: Partial<State>) => { state = { ...state, ...p }; for (const l of listeners) l(); };
export const useAccount = () => useSyncExternalStore((f) => { listeners.add(f); return () => { listeners.delete(f); }; }, () => state);
export const getAccount = () => state;

let remote: Remote | null = null;
let keys: (AccountKeys & { circleId: string | null; circleKey: CryptoKey | null }) | null = null;
let engine: SyncEngine | null = null;
let stopEngine: (() => void) | null = null;

const SESSION = 'account';
const syncState = {
  load: async () => (await store.openLocal<{ lastSeq: number }>('sync')) ?? { lastSeq: 0 },
  save: (v: { lastSeq: number }) => store.sealLocal('sync', v),
};

async function persistKeys() {
  if (keys) await store.sealLocal(SESSION, await serialiseSession(keys, state.email));
}

function startEngine() {
  if (!remote || !keys?.circleId || !keys.circleKey) return;
  stopEngine?.();
  engine = new SyncEngine(store, remote, keys as CircleSession, syncState);
  engine.myMemberIds = () => store.all('members').filter((m) => m.userId === keys?.userId || !m.userId).map((m) => m.id);
  engine.onStatus = () => set({ status: engine!.status, lastSyncedAt: engine!.lastSyncedAt, error: engine!.status === 'error' ? engine!.lastError : '' });
  const stopSync = engine.start();
  // Refresh server reminder times when appointments or reminder settings change.
  let lastSig = '';
  let t: ReturnType<typeof setTimeout> | null = null;
  const onChange = () => {
    const d = getDevice();
    const sig = JSON.stringify([store.all('appointments').map((a) => [a.id, a.startsAt, a.recurrence, a.until, a.reminderMins, a.memberIds]), d.notifyAppointments, d.checkInTime, d.activeMemberId]);
    if (sig === lastSig) return;
    lastSig = sig;
    if (t) clearTimeout(t);
    t = setTimeout(() => scheduleServerReminders().catch(() => undefined), 3000);
  };
  const unsubStore = store.subscribe(onChange);
  const unsubDevice = subscribeDevice(onChange);
  stopEngine = () => { stopSync(); unsubStore(); unsubDevice(); if (t) clearTimeout(t); };
  set({ phase: 'connected', circleId: keys.circleId });
  linkMe();
  scheduleServerReminders().catch(() => undefined);
}

/** Make sure the person using this device is linked to their account in the circle's member list. */
function linkMe() {
  const me = store.get('members', getDevice().activeMemberId ?? '');
  if (keys && me && !me.userId && !store.all('members').some((m) => m.userId === keys!.userId)) store.patch('members', me.id, { userId: keys.userId });
}

/** Called after the journal is unlocked: resume any saved online session. */
export async function resume() {
  if (!cloudConfigured()) return;
  const sb = supabase();
  const { data } = await sb.auth.getSession();
  const user = data.session?.user;
  if (!user) { set({ phase: 'signed-out' }); return; }
  remote = new SupabaseRemote(sb, user.id);
  set({ email: user.email ?? '' });
  const saved = await store.openLocal<Parameters<typeof restoreSession>[0]>(SESSION);
  if (saved && saved.userId === user.id) {
    keys = await restoreSession(saved);
    if (keys.circleId) { startEngine(); return; }
    set({ phase: 'needs-circle' });
    return;
  }
  set({ phase: 'needs-keys' });
}

export function lockAccount() {
  stopEngine?.(); stopEngine = null; engine = null; keys = null;
  if (state.phase !== 'off') set({ phase: remote ? 'needs-keys' : 'signed-out', status: 'idle' });
}

export async function sendCode(email: string) {
  const redirect = location.origin + location.pathname;
  const { error } = await supabase().auth.signInWithOtp({ email, options: { emailRedirectTo: redirect, shouldCreateUser: true } });
  if (error) throw new Error(error.message);
  set({ email });
}

export async function verifyCode(email: string, code: string) {
  const { data, error } = await supabase().auth.verifyOtp({ email, token: code.trim(), type: 'email' });
  if (error || !data.user) throw new Error(error?.message ?? 'That code did not work.');
  remote = new SupabaseRemote(supabase(), data.user.id);
  set({ email: data.user.email ?? email, phase: 'needs-keys' });
}

/** Open (or first create) account keys. The passphrase must match this device's journal passphrase. */
export async function unlockKeys(passphrase: string): Promise<'ok' | 'wrong-journal' | 'wrong-account'> {
  if (!remote) throw new Error('Not signed in');
  if (!(await unlockVault(persist, passphrase))) return 'wrong-journal';
  const existing = await openAccount(remote, passphrase);
  if (existing === 'wrong') return 'wrong-account';
  const acct = existing ?? (await createAccount(remote, passphrase));
  const circle = await openCircle(remote, acct);
  keys = { ...acct, circleId: circle?.circleId ?? null, circleKey: circle?.circleKey ?? null };
  await persistKeys();
  if (keys.circleId) startEngine(); else set({ phase: 'needs-circle' });
  return 'ok';
}

export async function startCircle() {
  if (!remote || !keys) throw new Error('Not ready');
  const c = await createCircle(remote, keys);
  keys = { ...keys, circleId: c.circleId, circleKey: c.circleKey };
  await persistKeys();
  await store.queueAll(); // upload everything already on this device
  startEngine();
}

export async function join(token: string) {
  if (!remote || !keys) throw new Error('Not ready');
  const c = await joinWithInvite(remote, keys, token);
  keys = { ...keys, circleId: c.circleId, circleKey: c.circleKey };
  await persistKeys();
  await store.queueAll();
  startEngine();
  await engine?.sync();
}

export async function invite(): Promise<string> {
  if (!remote || !keys?.circleKey) throw new Error('Connect a circle first.');
  const token = await makeInvite(remote, keys as CircleSession);
  return `${location.origin}${location.pathname}#invite=${token}`;
}

export async function circleAccounts() {
  if (!remote || !keys?.circleId) return [];
  return remote.circleMembers(keys.circleId);
}

export async function removeAccount(userId: string) {
  if (!remote || !keys?.circleId) return;
  await remote.removeMember(keys.circleId, userId);
}

export function syncNow() { return engine?.sync(); }

export async function signOut() {
  stopEngine?.(); stopEngine = null; engine = null; keys = null; remote = null;
  await store.dropLocal(SESSION); await store.dropLocal('sync');
  if (cloudConfigured()) await supabase().auth.signOut().catch(() => undefined);
  set({ phase: cloudConfigured() ? 'signed-out' : 'off', circleId: null, email: '', status: 'idle' });
}

/** Keep the server copy of account keys in step with a new passphrase. */
export async function passphraseChanged(newPassphrase: string) {
  if (remote && keys) await rewrapAccount(remote, keys, newPassphrase);
}

export function currentUserId() { return keys?.userId ?? null; }
export function currentRemote() { return remote; }

/**
 * Tell the server when to send push reminders for the next two weeks.
 * Only times and generic kinds go to the server; never titles, places or notes.
 */
export async function scheduleServerReminders() {
  if (!remote || !keys) return;
  const d = getDevice();
  const me = store.get('members', d.activeMemberId ?? '') ?? store.all('members').find((m) => m.userId === keys!.userId);
  const now = Date.now(), until = now + 14 * 86400000;
  const rows: ReminderRow[] = [];
  if (d.notifyAppointments && me) {
    const mine = store.all('appointments').filter((a) => !a.memberIds.length || a.memberIds.includes(me.id));
    for (const r of remindersBetween(mine, now, until)) {
      rows.push({ user_id: keys.userId, kind: 'appointment', fire_at: new Date(r.fireAt).toISOString(), tag: `appt-${r.appointmentId}-${r.fireAt}`, minutes_before: r.minutesBefore });
    }
  }
  for (const t of checkInTimes(d.checkInTime, now, until)) rows.push({ user_id: keys.userId, kind: 'checkin', fire_at: new Date(t).toISOString(), tag: `checkin-${t}` });
  await remote.replaceOwnReminders(rows);
}
