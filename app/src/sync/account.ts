/**
 * The online circle, as seen by the UI: sign-in, account keys, joining or creating
 * a circle, invites, the running sync engine, and server-side reminders for push.
 */
import { useSyncExternalStore } from 'react';
import { factsFor, getActivity, getDevice, persist, store, subscribeDevice, updateDevice } from '../db';
import { nextTip } from '../lib/progress';
import { doseTimesBetween } from '../lib/body';
import { unlockVault } from '../data/vault';
import { APP_VERSION } from '../version';
import { checkInTimes, remindersBetween } from '../lib/schedule';
import { nudgeTimesBetween } from '../lib/nudges';
import { nudgesFor } from '../lib/useReminders';
import { SyncEngine } from './engine';
import { restoreJournal } from './restore';
import { createAccount, createCircle, rewrapAccount, joinWithInvite, makeInvite, openAccount, openCircle, restoreSession, serialiseSession, type AccountKeys, type CircleSession } from './keys';
import type { CircleRole, InviteRow, Remote, ReminderRow } from './remote';
import type { CareShare, Invitation } from '../types';
import { buildCarePayload, careLink, newShareKey, payloadHash, sealPayload, type CareData } from '../lib/careShare';
import { partWords } from '../lib/util';
import { cloudConfigured, supabase, SupabaseRemote } from './supabase';

export type Phase =
  | 'off'            // cloud not configured in this build
  | 'signed-out'
  | 'needs-keys'     // signed in; must unlock (or create) account keys with the passphrase
  | 'needs-circle'   // keys ready; no circle yet
  | 'connected';

interface State { phase: Phase; email: string; circleId: string | null; status: SyncEngine['status']; lastSyncedAt: number; error: string; role: CircleRole | null }

let state: State = { phase: cloudConfigured() ? 'signed-out' : 'off', email: '', circleId: null, status: 'idle', lastSyncedAt: 0, error: '', role: null };
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
    const sig = JSON.stringify([store.all('appointments').map((a) => [a.id, a.startsAt, a.recurrence, a.until, a.reminderMins, a.memberIds]), d.notifyAppointments, d.checkInTime, d.activeMemberId, d.nudges, d.nudgesPerDay, d.quietStart, d.quietEnd, d.notifyMeds, store.all('meds').map((m) => [m.id, m.times, m.remind, m.active])]);
    if (sig === lastSig) return;
    lastSig = sig;
    if (t) clearTimeout(t);
    t = setTimeout(() => scheduleServerReminders().catch(() => undefined), 3000);
  };
  const unsubStore = store.subscribe(() => { onChange(); scheduleCarePublish(); });
  const unsubDevice = subscribeDevice(onChange);
  stopEngine = () => { stopSync(); unsubStore(); unsubDevice(); if (t) clearTimeout(t); };
  import('./community').then((c) => c.flushRequests()).catch(() => undefined);
  scheduleCarePublish(1000);
  set({ phase: 'connected', circleId: keys.circleId });
  linkMe();
  refreshRole().catch(() => undefined);
  scheduleServerReminders().catch(() => undefined);
}

/** What this account may do in the circle. View-only members download but never upload. */
export async function refreshRole() {
  if (!remote || !keys?.circleId) return;
  const mine = (await remote.myMemberships()).find((m) => m.circle_id === keys!.circleId);
  const role = mine?.role ?? null;
  if (engine) engine.readOnly = role === 'viewer';
  // Remember the last role seen, so someone who was just handed the circle gets a one-time note.
  try {
    const key = `idid.role.${keys.circleId}`;
    const before = localStorage.getItem(key);
    if (before && before !== 'owner' && role === 'owner') localStorage.setItem('idid.newOwner', '1');
    if (role) localStorage.setItem(key, role);
  } catch { /* storage unavailable */ }
  set({ role });
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
  if (keys) return; // already connected (for example, just restored on a new device)
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

/** Email a sign-in code. `existingOnly` (signing in on a new device) never creates a new account. */
export async function sendCode(email: string, existingOnly = false) {
  const redirect = location.origin + location.pathname;
  const { error } = await supabase().auth.signInWithOtp({ email, options: { emailRedirectTo: redirect, shouldCreateUser: !existingOnly } });
  if (error) {
    if (existingOnly && /signups? not allowed|not found|otp_disabled/i.test(error.message)) throw new Error("We couldn't find an iDID account for that email. Check the spelling, or set up iDID as new.");
    throw new Error(error.message);
  }
  set({ email });
}

export type RestoreResult =
  | { result: 'ok'; recoveryCode: string; entries: number }
  | { result: 'no-account' | 'wrong-passphrase' | 'no-circle' };

/** Returning person on a new device, already signed in with their email code: bring their journal here. */
export async function restoreOnNewDevice(passphrase: string): Promise<RestoreResult> {
  if (!remote) throw new Error('Not signed in');
  const r = await restoreJournal({
    remote, persist, store, passphrase, syncState,
    beforeOpen: (session) => {
      keys = session; // set first, so the app's automatic resume() leaves this session alone
      try { localStorage.setItem('idid.nudge.handled', String(Date.now())); } catch { /* ignore */ }
    },
  });
  if (r.result !== 'ok') return r;
  await persistKeys();
  updateDevice({ activeMemberId: r.meId, lastSeenVersion: APP_VERSION });
  startEngine();
  return { result: 'ok', recoveryCode: r.recoveryCode, entries: r.entries };
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

/**
 * Join a circle from an invite. Everything on this device is uploaded to it. If this account had a
 * circle of its own that nobody else is in, that old copy is deleted from the server: the same data
 * now lives in the circle joined. Returns who the invite was made for, if the inviter said.
 */
export async function join(token: string): Promise<{ suggestedMemberId: string | null }> {
  if (!remote || !keys) throw new Error('Not ready');
  const old = keys.circleId;
  const c = await joinWithInvite(remote, keys, token);
  keys = { ...keys, circleId: c.circleId, circleKey: c.circleKey };
  await persistKeys();
  await store.dropLocal('sync'); // start reading the new circle from the beginning
  await store.queueAll();
  startEngine();
  await engine?.sync();
  if (old && old !== c.circleId) {
    const others = (await remote.circleMembers(old).catch(() => [])).filter((m) => m.user_id !== keys!.userId);
    if (!others.length) await remote.deleteCircle(old).catch(() => undefined);
    else await remote.removeMember(old, keys.userId).catch(() => undefined);
  }
  const inv = store.get('invitations', token.split('.')[0]);
  return { suggestedMemberId: inv?.memberId ?? null };
}

export async function invite(): Promise<string> {
  return (await invitePerson({ name: '', memberId: null, role: 'member', contact: '' })).link;
}

/** Make a one-time invite link for someone, and remember who it's for so its status can be shown. */
export async function invitePerson(o: { name: string; memberId: string | null; role: 'member' | 'viewer'; contact: string }): Promise<Invitation> {
  if (!remote || !keys?.circleKey) throw new Error('Connect a circle first.');
  const token = await makeInvite(remote, keys as CircleSession, o.role);
  const inv: Invitation = { id: token.split('.')[0], ...o, link: `${location.origin}${location.pathname}#invite=${token}`, createdBy: getDevice().activeMemberId, createdAt: Date.now(), cancelledAt: null };
  await store.put('invitations', inv);
  return inv;
}

export type InviteStatus = 'waiting' | 'joined' | 'expired' | 'cancelled';
/** The server's view of this circle's invites, by id. */
export async function inviteStatuses(): Promise<Map<string, InviteRow>> {
  if (!remote || !keys?.circleId) return new Map();
  return new Map((await remote.listInvites(keys.circleId)).map((r) => [r.id, r]));
}
export function statusOf(inv: Invitation, row: InviteRow | undefined, now = Date.now()): InviteStatus {
  if (row?.used_by) return 'joined';
  if (inv.cancelledAt || !row) return 'cancelled';
  return Date.parse(row.expires_at) < now ? 'expired' : 'waiting';
}

export async function cancelInvitation(id: string) {
  await remote?.revokeInvite(id).catch(() => undefined);
  if (store.get('invitations', id)) await store.patch('invitations', id, { cancelledAt: Date.now() });
}

/** Cancel an invite and make a fresh link for the same person. */
export async function renewInvitation(id: string): Promise<Invitation> {
  const old = store.get('invitations', id);
  if (!old) throw new Error('Invite not found');
  await cancelInvitation(id);
  return invitePerson({ name: old.name, memberId: old.memberId, role: old.role, contact: old.contact });
}

/** Owner only: hand the circle to someone already in it. You stay in the circle and can view and add. */
export async function transferCircle(userId: string) {
  if (!remote || !keys?.circleId) throw new Error('Connect a circle first.');
  await remote.transferOwnership(keys.circleId, userId);
  await refreshRole();
}

/** Owner only: let someone add and change things, or only view. */
export async function setAccess(userId: string, role: 'member' | 'viewer') {
  if (!remote || !keys?.circleId) throw new Error('Connect a circle first.');
  await remote.setMemberRole(keys.circleId, userId, role);
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
  // At most one generic "something might help" push a week, if there are untried helpful features.
  if (me && d.featureTips) {
    const a = getActivity(me.id);
    const f = factsFor(me.id, { online: true, notifications: true });
    const lastTip = a.lastTipAt ?? me.createdAt;
    const due = Math.max(now + 3600000, lastTip + 7 * 86400000);
    if (due < until && nextTip(f, a, me.createdAt, due)) {
      const [t] = nudgeTimesBetween(`tip-${me.id}`, due, due + 86400000, 1, d.quietStart, d.quietEnd);
      if (t) rows.push({ user_id: keys.userId, kind: 'tip', fire_at: new Date(t).toISOString(), tag: `tip-${t}` });
    }
  }
  if (me && d.notifyMeds) {
    for (const r of doseTimesBetween(store.all('meds').filter((m) => m.memberId === me.id && m.remind), now, until)) {
      rows.push({ user_id: keys.userId, kind: 'med', fire_at: new Date(r.at).toISOString(), tag: `med-${r.medId}-${r.at}` });
    }
  }
  if (me && nudgesFor(me, d)) {
    for (const t of nudgeTimesBetween(me.id, now, until, d.nudgesPerDay, d.quietStart, d.quietEnd)) rows.push({ user_id: keys.userId, kind: 'checkin', fire_at: new Date(t).toISOString(), tag: `nudge-${t}` });
  }
  await remote.replaceOwnReminders(rows);
}

// ---------- Care team: read-only shared views ----------

function careData(): CareData {
  const pw = partWords(store.get('prefs', 'prefs')?.partWord ?? 'parts');
  return {
    members: store.all('members'), parts: store.all('parts'), entries: store.all('entries'), observations: store.all('observations'),
    checkins: store.all('checkins'), safety: store.all('safety'), meds: store.all('meds'), appointments: store.all('appointments'),
    prep: store.all('prep'), contacts: store.all('contacts'), partWord: { one: pw.one, many: pw.many },
  };
}

export function careSharingAvailable() { return !!remote && !!keys; }

/** Re-upload one view if what it shows has changed (or always, with `force`). */
export async function publishCareShare(id: string, force = false) {
  const share = store.get('careShares', id);
  if (!remote || !share) return;
  if (share.expiresAt && share.expiresAt < Date.now()) return;
  const payload = buildCarePayload(careData(), share);
  const hash = payloadHash(payload);
  if (!force && hash === share.publishedHash) return;
  await remote.updateCareShare(id, await sealPayload(payload, share.key, id), share.expiresAt ? new Date(share.expiresAt).toISOString() : null);
  await store.patch('careShares', id, { publishedAt: Date.now(), publishedHash: hash });
}

let careTimer: ReturnType<typeof setTimeout> | null = null;
let publishing = false;
/** Keep shared views current: after changes settle, refresh any whose content changed. */
export function scheduleCarePublish(ms = 8000) {
  if (careTimer) clearTimeout(careTimer);
  careTimer = setTimeout(async () => {
    if (publishing || !remote) return;
    publishing = true;
    try { for (const s of store.all('careShares')) await publishCareShare(s.id).catch(() => undefined); } finally { publishing = false; }
  }, ms);
}

/** Share a read-only view after the person has explicitly agreed. Returns the link to give. */
export async function createCareShare(o: Omit<CareShare, 'id' | 'key' | 'createdAt' | 'updatedAt' | 'publishedAt' | 'publishedHash'>): Promise<{ share: CareShare; link: string }> {
  if (!remote) throw new Error('Sign in to your online account first.');
  if (!o.consentedAt) throw new Error('Sharing needs your agreement first.');
  const id = await remote.createCareShare(o.expiresAt ? new Date(o.expiresAt).toISOString() : null);
  const now = Date.now();
  const share: CareShare = { ...o, id, key: newShareKey(), createdAt: now, updatedAt: now, publishedAt: null, publishedHash: '' };
  await store.put('careShares', share);
  try { await publishCareShare(id, true); } catch (e) { await remote.deleteCareShare(id).catch(() => undefined); await store.remove('careShares', id); throw e; }
  return { share: store.get('careShares', id)!, link: careLink(share) };
}

/** Change what a view shows (after the person agrees again) or who it's for. */
export async function updateCareShare(id: string, changes: Partial<Pick<CareShare, 'name' | 'role' | 'contact' | 'scope' | 'range' | 'expiresAt' | 'consentedAt'>>) {
  await store.patch('careShares', id, { ...changes, updatedAt: Date.now() });
  await publishCareShare(id, true);
}

/** Remove someone's access: the view is deleted from the server and its link stops working. */
export async function removeCareShare(id: string) {
  if (remote) await remote.deleteCareShare(id);
  await store.remove('careShares', id);
}

export async function careShareStats() {
  if (!remote) return new Map<string, { views: number; last_viewed_at: string | null }>();
  return new Map((await remote.listCareShares()).map((r) => [r.id, r]));
}
