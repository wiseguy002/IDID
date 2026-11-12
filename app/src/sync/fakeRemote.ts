/** In-memory server with the same access rules as the real schema, for tests. */
import type { MembershipRow, ProfileRow, PushSub, RecordRow, ReminderRow, Remote } from './remote';

export class FakeServer {
  profiles = new Map<string, ProfileRow>();
  members: MembershipRow[] = [];
  invites = new Map<string, { circle_id: string; wrapped_circle_key: string; used: boolean }>();
  records = new Map<string, RecordRow & { circle_id: string }>();
  reminders: (ReminderRow & { created_by: string })[] = [];
  subs: (PushSub & { user_id: string })[] = [];
  seq = 0;
  listeners = new Map<string, Set<() => void>>();
  as(userId: string): Remote { return new FakeRemote(this, userId); }
}

class FakeRemote implements Remote {
  private s: FakeServer;
  private uid: string;
  constructor(s: FakeServer, uid: string) { this.s = s; this.uid = uid; }
  private member(c: string) { if (!this.s.members.some((m) => m.circle_id === c && m.user_id === this.uid)) throw new Error('not a member'); }
  userId() { return this.uid; }
  async getProfile() { return structuredClone(this.s.profiles.get(this.uid) ?? null); }
  async putProfile(p: ProfileRow) { if (p.id !== this.uid) throw new Error('rls'); this.s.profiles.set(p.id, structuredClone(p)); }
  async myMemberships() { return this.s.members.filter((m) => m.user_id === this.uid).map((m) => ({ ...m })); }
  async circleMembers(c: string) { this.member(c); return this.s.members.filter((m) => m.circle_id === c).map((m) => ({ ...m })); }
  async createCircle(sealed: string) {
    const id = crypto.randomUUID();
    this.s.members.push({ circle_id: id, user_id: this.uid, role: 'owner', sealed_circle_key: sealed });
    return id;
  }
  async createInvite(c: string, wrapped: string) { this.member(c); const id = crypto.randomUUID(); this.s.invites.set(id, { circle_id: c, wrapped_circle_key: wrapped, used: false }); return id; }
  async getInvite(id: string) { const i = this.s.invites.get(id); return i && !i.used ? { circle_id: i.circle_id, wrapped_circle_key: i.wrapped_circle_key } : null; }
  async acceptInvite(id: string, sealed: string) {
    const i = this.s.invites.get(id);
    if (!i || i.used) throw new Error('invite is invalid, used or expired');
    i.used = true;
    this.s.members.push({ circle_id: i.circle_id, user_id: this.uid, role: 'member', sealed_circle_key: sealed });
    return i.circle_id;
  }
  async removeMember(c: string, u: string) { this.s.members = this.s.members.filter((m) => !(m.circle_id === c && m.user_id === u)); }
  async pull(c: string, after: number, limit: number) {
    this.member(c);
    return [...this.s.records.values()].filter((r) => r.circle_id === c && r.seq > after).sort((a, b) => a.seq - b.seq).slice(0, limit).map(({ rid, ct, seq }) => ({ rid, ct, seq }));
  }
  async push(c: string, rows: { rid: string; ct: string }[]) {
    this.member(c);
    for (const r of rows) this.s.records.set(`${c}:${r.rid}`, { circle_id: c, rid: r.rid, ct: r.ct, seq: ++this.s.seq });
    for (const l of this.s.listeners.get(c) ?? []) l();
  }
  subscribe(c: string, fn: () => void) {
    const set = this.s.listeners.get(c) ?? new Set();
    set.add(fn); this.s.listeners.set(c, set);
    return () => { set.delete(fn); };
  }
  async replaceOwnReminders(rows: ReminderRow[]) {
    this.s.reminders = this.s.reminders.filter((r) => !(r.user_id === this.uid && r.kind !== 'observation'));
    for (const r of rows) await this.addReminder(r);
  }
  async addReminder(r: ReminderRow) {
    const shares = this.s.members.some((a) => a.user_id === this.uid && this.s.members.some((b) => b.circle_id === a.circle_id && b.user_id === r.user_id));
    if (r.user_id !== this.uid && !((r.kind === 'observation' || r.kind === 'checkon') && shares)) throw new Error('rls');
    if (!this.s.reminders.some((x) => x.user_id === r.user_id && x.tag === r.tag)) this.s.reminders.push({ ...r, created_by: this.uid });
  }
  async savePushSubscription(s: PushSub) { this.s.subs.push({ ...s, user_id: this.uid }); }
}
