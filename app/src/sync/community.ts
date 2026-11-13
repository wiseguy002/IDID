/**
 * Community features that go through the server: anonymous kind notes and feature
 * requests. These carry no journal content and are not end-to-end encrypted.
 */
import { cloudConfigured, supabase } from './supabase';
import { getAccount } from './account';
import type { KindIcon } from '../lib/kindness';

export function communityAvailable() {
  const p = getAccount().phase;
  return cloudConfigured() && p !== 'off' && p !== 'signed-out';
}

const check = <T>(r: { data: T; error: { message: string } | null }) => { if (r.error) throw new Error(r.error.message); return r.data; };
async function uid() {
  const { data } = await supabase().auth.getUser();
  if (!data.user) throw new Error('Sign in first.');
  return data.user.id;
}

// ---------- Kind notes ----------

export interface KindNote { id: string; message_id: number; icon: KindIcon; created_at: string; read_at: string | null }

export async function getReceiveKindNotes(): Promise<boolean | null> {
  const r = check(await supabase().from('kindness_optin').select('receive').eq('user_id', await uid()).maybeSingle()) as { receive: boolean } | null;
  return r ? r.receive : null;
}
export async function setReceiveKindNotes(receive: boolean) {
  check(await supabase().from('kindness_optin').upsert({ user_id: await uid(), receive, updated_at: new Date().toISOString() }));
}
/** true = delivered to someone; false = nobody could receive one right now. */
export async function sendKindNote(messageId: number, icon: KindIcon): Promise<boolean> {
  const r = await supabase().rpc('send_kindness', { message_id: messageId, icon });
  if (r.error) throw new Error(/daily limit/.test(r.error.message) ? "You've sent lots of kindness today. Try again tomorrow." : r.error.message);
  return r.data as boolean;
}
export async function myKindNotes(): Promise<KindNote[]> {
  return check(await supabase().from('kind_notes').select('id,message_id,icon,created_at,read_at').order('created_at', { ascending: false }).limit(50)) as KindNote[];
}
export async function markKindNotesRead(ids: string[]) {
  if (ids.length) check(await supabase().from('kind_notes').update({ read_at: new Date().toISOString() }).in('id', ids));
}

// ---------- Feature requests ----------

export type RequestKind = 'feature' | 'idea' | 'service' | 'improvement' | 'problem' | 'other';
export type RequestStatus = 'new' | 'reviewing' | 'planned' | 'in-progress' | 'done' | 'declined';
export interface FeatureRequest {
  id: string; kind: RequestKind; title: string; details: string; app_version: string | null;
  status: RequestStatus; admin_note: string | null; created_at: string; updated_at: string;
}
export interface RequestDraft { kind: RequestKind; title: string; details: string; app_version: string }

export const REQUEST_KINDS: { value: RequestKind; label: string }[] = [
  { value: 'feature', label: 'New feature' },
  { value: 'improvement', label: 'Make something better' },
  { value: 'idea', label: 'Idea' },
  { value: 'service', label: 'Service or resource to add' },
  { value: 'problem', label: 'Something isn’t working' },
  { value: 'other', label: 'Other' },
];
export const STATUS_LABELS: Record<RequestStatus, string> = {
  new: 'Received', reviewing: 'Being reviewed', planned: 'Planned', 'in-progress': 'In progress', done: 'Done', declined: 'Not planned',
};

export async function submitRequest(d: RequestDraft) {
  check(await supabase().from('feedback').insert({ ...d, created_by: await uid() }));
}
export async function myRequests(): Promise<FeatureRequest[]> {
  return check(await supabase().from('feedback').select('*').eq('created_by', await uid()).order('created_at', { ascending: false })) as FeatureRequest[];
}
export async function isAdmin(): Promise<boolean> {
  const r = await supabase().rpc('is_app_admin');
  return !r.error && r.data === true;
}
export interface CountWeek { week: string; reports: number; features: { feature: string; uses: number; people: number }[] }
/** Admins only: the anonymous feature totals for the most recent weeks. */
export async function featureCounts(weeks = 6): Promise<CountWeek[]> {
  const reps = check(await supabase().from('feature_count_reports').select('week, reports').order('week', { ascending: false }).limit(weeks)) as { week: string; reports: number }[];
  if (!reps.length) return [];
  const rows = check(await supabase().from('feature_counts').select('week, feature, uses, people').in('week', reps.map((r) => r.week))) as { week: string; feature: string; uses: number; people: number }[];
  return reps.map((r) => ({ ...r, features: rows.filter((x) => x.week === r.week).sort((a, b) => b.people - a.people || b.uses - a.uses) }));
}
export async function allRequests(): Promise<FeatureRequest[]> {
  return check(await supabase().from('feedback').select('*').order('created_at', { ascending: false }).limit(1000)) as FeatureRequest[];
}
export async function updateRequest(id: string, patch: { status?: RequestStatus; admin_note?: string | null }) {
  check(await supabase().from('feedback').update(patch).eq('id', id));
}

// ---------- Requests written while offline or signed out wait here ----------

const QUEUE = 'idid.requests.queue';
export function queuedRequests(): RequestDraft[] { try { return JSON.parse(localStorage.getItem(QUEUE) || '[]'); } catch { return []; } }
function saveQueue(q: RequestDraft[]) { try { localStorage.setItem(QUEUE, JSON.stringify(q)); } catch { /* ignore */ } }
export function queueRequest(d: RequestDraft) { saveQueue([...queuedRequests(), d]); }
export async function flushRequests(): Promise<number> {
  if (!communityAvailable()) return 0;
  const q = queuedRequests();
  let sent = 0;
  for (const d of q) { try { await submitRequest(d); sent++; } catch { break; } }
  saveQueue(q.slice(sent));
  return sent;
}
