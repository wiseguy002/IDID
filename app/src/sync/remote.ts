/** Everything the sync engine needs from the server. Implemented by Supabase (and a fake for tests). */
export interface ProfileRow {
  id: string;
  public_key: JsonWebKey;
  wrapped_private_key: string;
  key_salt: string;
  key_iterations: number;
  sealed_personal_key: string;
}
export type CircleRole = 'owner' | 'member' | 'viewer';
export interface MembershipRow { circle_id: string; user_id: string; role: CircleRole; sealed_circle_key: string; created_at?: string }
/** An invite as the circle sees it: whether it has been used, by whom, and when it expires. */
export interface InviteRow { id: string; created_at: string; expires_at: string; used_by: string | null; used_at: string | null; role: 'member' | 'viewer' }
/** A care-team share as its owner sees it (the summary itself is ciphertext). */
export interface CareShareRow { id: string; views: number; last_viewed_at: string | null; updated_at: string; expires_at: string | null }
export interface RecordRow { rid: string; ct: string; seq: number }
export interface ReminderRow { user_id: string; kind: 'appointment' | 'checkin' | 'observation' | 'kindness' | 'tip' | 'checkon' | 'med'; fire_at: string; tag: string; minutes_before?: number | null }
export interface PushSub { endpoint: string; p256dh: string; auth: string }

export interface Remote {
  userId(): string | null;
  getProfile(): Promise<ProfileRow | null>;
  putProfile(p: ProfileRow): Promise<void>;
  myMemberships(): Promise<MembershipRow[]>;
  circleMembers(circleId: string): Promise<MembershipRow[]>;
  createCircle(sealedKey: string): Promise<string>;
  createInvite(circleId: string, wrappedKey: string, role?: 'member' | 'viewer'): Promise<string>;
  listInvites(circleId: string): Promise<InviteRow[]>;
  revokeInvite(inviteId: string): Promise<void>;
  /** Owner only: let someone add and change things ('member') or only view ('viewer'). */
  setMemberRole(circleId: string, userId: string, role: 'member' | 'viewer'): Promise<void>;
  /** Owner only: make someone already in the circle its owner; the caller stays as a member. */
  transferOwnership(circleId: string, newOwner: string): Promise<void>;
  getInvite(inviteId: string): Promise<{ circle_id: string; wrapped_circle_key: string } | null>;
  acceptInvite(inviteId: string, sealedKey: string): Promise<string>;
  removeMember(circleId: string, userId: string): Promise<void>;
  /** Owner only: delete a circle and everything stored in it. */
  deleteCircle(circleId: string): Promise<void>;
  pull(circleId: string, afterSeq: number, limit: number): Promise<RecordRow[]>;
  /** One record by its id, or null. */
  getRecord(circleId: string, rid: string): Promise<RecordRow | null>;
  /** Public keys of everyone in the circle (members only). */
  circlePublicKeys(circleId: string): Promise<{ user_id: string; public_key: JsonWebKey }[]>;
  /** Owner only: replace every member's sealed circle key at once; cancels unused invites. */
  rotateCircleKey(circleId: string, sealed: Record<string, string>): Promise<void>;
  push(circleId: string, rows: { rid: string; ct: string }[]): Promise<void>;
  subscribe(circleId: string, onChange: () => void): () => void;
  /** Replace this user's unsent appointment, check-in and suggestion reminders. */
  replaceOwnReminders(rows: ReminderRow[]): Promise<void>;
  addReminder(row: ReminderRow): Promise<void>;
  savePushSubscription(s: PushSub): Promise<void>;
  createCareShare(expiresAt: string | null): Promise<string>;
  updateCareShare(id: string, ct: string, expiresAt: string | null): Promise<void>;
  deleteCareShare(id: string): Promise<void>;
  listCareShares(): Promise<CareShareRow[]>;
}
