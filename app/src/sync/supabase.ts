import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import type { MembershipRow, ProfileRow, PushSub, RecordRow, ReminderRow, Remote } from './remote';

const URL_ = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const ANON = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined;
export const VAPID_PUBLIC_KEY = import.meta.env.VITE_VAPID_PUBLIC_KEY as string | undefined;

export function cloudConfigured() { return !!(URL_ && ANON); }

let client: SupabaseClient | null = null;
export function supabase(): SupabaseClient {
  if (!cloudConfigured()) throw new Error('The online circle is not set up for this copy of IDID.');
  return (client ??= createClient(URL_!, ANON!, { auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true, flowType: 'pkce' } }));
}

const check = <T>(r: { data: T; error: { message: string } | null }) => { if (r.error) throw new Error(r.error.message); return r.data; };

export class SupabaseRemote implements Remote {
  private uid: string | null = null;
  private sb: SupabaseClient;
  constructor(sb: SupabaseClient, userId: string) { this.sb = sb; this.uid = userId; }
  userId() { return this.uid; }
  async getProfile() {
    return check(await this.sb.from('profiles').select('*').eq('id', this.uid!).maybeSingle()) as ProfileRow | null;
  }
  async putProfile(p: ProfileRow) { check(await this.sb.from('profiles').upsert(p)); }
  async myMemberships() {
    return check(await this.sb.from('circle_members').select('circle_id,user_id,role,sealed_circle_key').eq('user_id', this.uid!)) as MembershipRow[];
  }
  async circleMembers(circleId: string) {
    return check(await this.sb.from('circle_members').select('circle_id,user_id,role,sealed_circle_key').eq('circle_id', circleId)) as MembershipRow[];
  }
  async createCircle(sealedKey: string) { return check(await this.sb.rpc('create_circle', { sealed_key: sealedKey })) as string; }
  async createInvite(circleId: string, wrapped: string) {
    return (check(await this.sb.from('invites').insert({ circle_id: circleId, wrapped_circle_key: wrapped }).select('id').single()) as { id: string }).id;
  }
  async getInvite(id: string) {
    const rows = check(await this.sb.rpc('get_invite', { invite_id: id })) as { circle_id: string; wrapped_circle_key: string }[];
    return rows[0] ?? null;
  }
  async acceptInvite(id: string, sealed: string) { return check(await this.sb.rpc('accept_invite', { invite_id: id, sealed_key: sealed })) as string; }
  async removeMember(circleId: string, userId: string) { check(await this.sb.from('circle_members').delete().eq('circle_id', circleId).eq('user_id', userId)); }
  async pull(circleId: string, afterSeq: number, limit: number) {
    return check(await this.sb.from('records').select('rid,ct,seq').eq('circle_id', circleId).gt('seq', afterSeq).order('seq').limit(limit)) as RecordRow[];
  }
  async push(circleId: string, rows: { rid: string; ct: string }[]) {
    if (rows.length) check(await this.sb.from('records').upsert(rows.map((r) => ({ circle_id: circleId, ...r })), { onConflict: 'circle_id,rid' }));
  }
  subscribe(circleId: string, onChange: () => void) {
    const ch = this.sb.channel(`records-${circleId}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'records', filter: `circle_id=eq.${circleId}` }, () => onChange())
      .subscribe();
    return () => { this.sb.removeChannel(ch); };
  }
  async replaceOwnReminders(rows: ReminderRow[]) {
    check(await this.sb.from('reminders').delete().eq('user_id', this.uid!).in('kind', ['appointment', 'checkin', 'tip']).is('sent_at', null));
    if (rows.length) check(await this.sb.from('reminders').upsert(rows, { onConflict: 'user_id,tag', ignoreDuplicates: true }));
  }
  async addReminder(row: ReminderRow) {
    check(await this.sb.from('reminders').upsert(row, { onConflict: 'user_id,tag', ignoreDuplicates: true }));
  }
  async savePushSubscription(s: PushSub) {
    check(await this.sb.from('push_subscriptions').upsert({ ...s, user_id: this.uid }, { onConflict: 'endpoint' }));
  }
}
