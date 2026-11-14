/** In-memory server with the same access rules as the real schema, for tests. */
import type { CareShareRow, InviteRow, MembershipRow, ProfileRow, PushSub, RecordRow, ReminderRow, Remote } from './remote';

/** The keyring's record id (keys.ts KEYRING_RID). Like the database, only rotateCircleKey may write it. */
const KEYRING = 'keyring-circle-v1';

export class FakeServer {
  profiles = new Map<string, ProfileRow>();
  members: MembershipRow[] = [];
  invites = new Map<string, { circle_id: string; wrapped_circle_key: string; used: boolean; used_by: string | null; role: 'member' | 'viewer'; created_by: string; created_at: string; expires_at: string }>();
  careShares = new Map<string, CareShareRow & { owner: string; ct: string }>();
  records = new Map<string, RecordRow & { circle_id: string }>();
  reminders: (ReminderRow & { created_by: string })[] = [];
  subs: (PushSub & { user_id: string })[] = [];
  seq = 0;
  listeners = new Map<string, Set<() => void>>();
  as(userId: string): Remote { return new FakeRemote(this, userId); }
  openCareShare(id: string) { return new FakeRemote(this, '').openCareShare(id); }
}

class FakeRemote implements Remote {
  private s: FakeServer;
  private uid: string;
  constructor(s: FakeServer, uid: string) { this.s = s; this.uid = uid; }
  private member(c: string) { if (!this.s.members.some((m) => m.circle_id === c && m.user_id === this.uid)) throw new Error('not a member'); }
  private writer(c: string) { if (!this.s.members.some((m) => m.circle_id === c && m.user_id === this.uid && m.role !== 'viewer')) throw new Error('rls: view only'); }
  private owner(c: string) { if (!this.s.members.some((m) => m.circle_id === c && m.user_id === this.uid && m.role === 'owner')) throw new Error('only the circle owner can change access'); }
  userId() { return this.uid; }
  async getProfile() { return structuredClone(this.s.profiles.get(this.uid) ?? null); }
  async putProfile(p: ProfileRow) { if (p.id !== this.uid) throw new Error('rls'); this.s.profiles.set(p.id, structuredClone(p)); }
  async myMemberships() { return this.s.members.filter((m) => m.user_id === this.uid).map((m) => ({ ...m })); }
  async circleMembers(c: string) { this.member(c); return this.s.members.filter((m) => m.circle_id === c).map((m) => ({ ...m })); }
  async createCircle(sealed: string) {
    const id = crypto.randomUUID();
    this.s.members.push({ circle_id: id, user_id: this.uid, role: 'owner', sealed_circle_key: sealed, created_at: new Date(Date.now() + this.s.members.length).toISOString() });
    return id;
  }
  async createInvite(c: string, wrapped: string, role: 'member' | 'viewer' = 'member') {
    this.writer(c); if (role === 'viewer') this.owner(c);
    const id = crypto.randomUUID();
    this.s.invites.set(id, { circle_id: c, wrapped_circle_key: wrapped, used: false, used_by: null, role, created_by: this.uid, created_at: new Date().toISOString(), expires_at: new Date(Date.now() + 7 * 86400000).toISOString() });
    return id;
  }
  async listInvites(c: string): Promise<InviteRow[]> {
    this.member(c);
    return [...this.s.invites.entries()].filter(([, i]) => i.circle_id === c).map(([id, i]) => ({ id, created_at: i.created_at, expires_at: i.expires_at, used_by: i.used_by, used_at: i.used ? new Date().toISOString() : null, role: i.role }));
  }
  async revokeInvite(id: string) { const i = this.s.invites.get(id); if (i) { this.member(i.circle_id); this.s.invites.delete(id); } }
  async transferOwnership(c: string, u: string) {
    this.owner(c);
    if (u === this.uid) throw new Error('you already own this circle');
    const next = this.s.members.find((x) => x.circle_id === c && x.user_id === u);
    if (!next) throw new Error('they need to join the circle first');
    this.s.members.find((x) => x.circle_id === c && x.user_id === this.uid)!.role = 'member';
    next.role = 'owner';
  }
  async setMemberRole(c: string, u: string, role: 'member' | 'viewer') {
    this.owner(c);
    const m = this.s.members.find((x) => x.circle_id === c && x.user_id === u && x.role !== 'owner');
    if (!m) throw new Error('no such person in this circle');
    m.role = role;
  }
  async getInvite(id: string) { const i = this.s.invites.get(id); return i && !i.used ? { circle_id: i.circle_id, wrapped_circle_key: i.wrapped_circle_key } : null; }
  async acceptInvite(id: string, sealed: string) {
    const i = this.s.invites.get(id);
    if (!i || i.used) throw new Error('invite is invalid, used or expired');
    i.used = true; i.used_by = this.uid;
    this.s.members.push({ circle_id: i.circle_id, user_id: this.uid, role: i.role, sealed_circle_key: sealed, created_at: new Date(Date.now() + this.s.members.length).toISOString() });
    return i.circle_id;
  }
  async deleteCircle(c: string) {
    this.owner(c);
    this.s.members = this.s.members.filter((m) => m.circle_id !== c);
    for (const [k, r] of this.s.records) if (r.circle_id === c) this.s.records.delete(k);
  }
  async removeMember(c: string, u: string) { this.s.members = this.s.members.filter((m) => !(m.circle_id === c && m.user_id === u)); }
  async pull(c: string, after: number, limit: number) {
    this.member(c);
    return [...this.s.records.values()].filter((r) => r.circle_id === c && r.seq > after).sort((a, b) => a.seq - b.seq).slice(0, limit).map(({ rid, ct, seq }) => ({ rid, ct, seq }));
  }
  async getRecord(c: string, rid: string) {
    this.member(c);
    const r = this.s.records.get(`${c}:${rid}`);
    return r ? { rid: r.rid, ct: r.ct, seq: r.seq } : null;
  }
  async circlePublicKeys(c: string) {
    if (!this.s.members.some((m) => m.circle_id === c && m.user_id === this.uid)) return [];
    return this.s.members.filter((m) => m.circle_id === c && this.s.profiles.has(m.user_id)).map((m) => ({ user_id: m.user_id, public_key: this.s.profiles.get(m.user_id)!.public_key }));
  }
  /** Set to make the next rotateCircleKey fail before changing anything (tests). */
  failNextRotation = false;
  async rotateCircleKey(c: string, sealed: Record<string, string>, keyring: string) {
    this.owner(c);
    if (this.failNextRotation) { this.failNextRotation = false; throw new Error('network'); }
    if (!keyring.startsWith('k:')) throw new Error('bad keyring');
    const ms = this.s.members.filter((m) => m.circle_id === c);
    if (ms.some((m) => !(m.user_id in sealed))) throw new Error('every member needs a copy of the new key');
    if (Object.keys(sealed).some((u) => !ms.some((m) => m.user_id === u))) throw new Error('keys must be for current members only');
    // All at once, like the database function.
    for (const m of ms) m.sealed_circle_key = sealed[m.user_id];
    const seq = ++this.s.seq;
    this.s.records.set(`${c}:${KEYRING}`, { circle_id: c, rid: KEYRING, ct: keyring, seq });
    let cancelled = 0;
    for (const [id, i] of this.s.invites) if (i.circle_id === c && !i.used) { this.s.invites.delete(id); cancelled++; }
    for (const l of this.s.listeners.get(c) ?? []) l();
    return { cancelled, seq };
  }
  async push(c: string, rows: { rid: string; ct: string }[]) {
    if (!rows.length) return;
    this.writer(c);
    if (rows.some((r) => r.rid === KEYRING)) throw new Error('rls: only the owner can change the keyring');
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
  async createCareShare(expiresAt: string | null) {
    const id = crypto.randomUUID();
    this.s.careShares.set(id, { id, owner: this.uid, ct: '', views: 0, last_viewed_at: null, updated_at: new Date().toISOString(), expires_at: expiresAt });
    return id;
  }
  async updateCareShare(id: string, ct: string, expiresAt: string | null) {
    const c = this.s.careShares.get(id);
    if (c && c.owner === this.uid) Object.assign(c, { ct, expires_at: expiresAt, updated_at: new Date().toISOString() });
  }
  async deleteCareShare(id: string) { const c = this.s.careShares.get(id); if (c && c.owner === this.uid) this.s.careShares.delete(id); }
  async listCareShares() { return [...this.s.careShares.values()].filter((c) => c.owner === this.uid).map(({ id, views, last_viewed_at, updated_at, expires_at }) => ({ id, views, last_viewed_at, updated_at, expires_at })); }
  /** What a care-team link sees (anyone holding the link; no account). */
  openCareShare(id: string) {
    const c = this.s.careShares.get(id);
    if (!c || !c.ct || (c.expires_at && Date.parse(c.expires_at) < Date.now())) return null;
    c.views++; c.last_viewed_at = new Date().toISOString();
    return { ct: c.ct, updated_at: c.updated_at };
  }
}
