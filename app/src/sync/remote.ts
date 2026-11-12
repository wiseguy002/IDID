/** Everything the sync engine needs from the server. Implemented by Supabase (and a fake for tests). */
export interface ProfileRow {
  id: string;
  public_key: JsonWebKey;
  wrapped_private_key: string;
  key_salt: string;
  key_iterations: number;
  sealed_personal_key: string;
}
export interface MembershipRow { circle_id: string; user_id: string; role: 'owner' | 'member'; sealed_circle_key: string }
export interface RecordRow { rid: string; ct: string; seq: number }
export interface ReminderRow { user_id: string; kind: 'appointment' | 'checkin' | 'observation' | 'kindness' | 'tip'; fire_at: string; tag: string; minutes_before?: number | null }
export interface PushSub { endpoint: string; p256dh: string; auth: string }

export interface Remote {
  userId(): string | null;
  getProfile(): Promise<ProfileRow | null>;
  putProfile(p: ProfileRow): Promise<void>;
  myMemberships(): Promise<MembershipRow[]>;
  circleMembers(circleId: string): Promise<MembershipRow[]>;
  createCircle(sealedKey: string): Promise<string>;
  createInvite(circleId: string, wrappedKey: string): Promise<string>;
  getInvite(inviteId: string): Promise<{ circle_id: string; wrapped_circle_key: string } | null>;
  acceptInvite(inviteId: string, sealedKey: string): Promise<string>;
  removeMember(circleId: string, userId: string): Promise<void>;
  pull(circleId: string, afterSeq: number, limit: number): Promise<RecordRow[]>;
  push(circleId: string, rows: { rid: string; ct: string }[]): Promise<void>;
  subscribe(circleId: string, onChange: () => void): () => void;
  /** Replace this user's unsent appointment, check-in and suggestion reminders. */
  replaceOwnReminders(rows: ReminderRow[]): Promise<void>;
  addReminder(row: ReminderRow): Promise<void>;
  savePushSubscription(s: PushSub): Promise<void>;
}
