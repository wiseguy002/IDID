export type ID = string;

export type MemberRole = 'self' | 'partner' | 'family' | 'friend' | 'clinician' | 'other';

/** A person in the circle: the person being supported, or someone who supports them. */
export interface Member {
  id: ID;
  name: string;
  role: MemberRole;
  /** True if this person's own experiences are tracked (they can be the subject of entries). */
  tracked: boolean;
  /** Can this person read entries about others in the circle? */
  canView: boolean;
  /** Can this person be asked to add observations? */
  canObserve: boolean;
  color: string;
  createdAt: number;
  /** Linked iDID account (when this person signs in on their own device). */
  userId?: string;
  /** Where and what kind of support to suggest. Encrypted like everything else. */
  support?: SupportProfile;
  /** This person's own healthy rituals for interrupting a hard pattern. */
  rituals?: string[];
}

export type CheckInFeeling = 'good' | 'okay' | 'wobbly' | 'struggling';
export type IdeaKind = 'breathe' | 'ritual' | 'outside' | 'positive' | 'pause' | 'reach-out' | 'note';

/** What a person has tried in iDID, for the Explore page and badges. One record per person. */
export interface Activity {
  /** Same as the member id. */
  id: ID;
  /** First time each event happened (event name → ms). */
  firsts: Record<string, number>;
  /** How many times each event happened. */
  counts: Record<string, number>;
  /** Badges already celebrated (badge id → ms), so each is only announced once. */
  badges: Record<string, number>;
  /** Suggestions the person chose not to see again. */
  dismissedTips: string[];
  lastTipAt: number | null;
}

/** A quick answer to a gentle nudge ("How are you doing right now?"). */
export interface CheckIn {
  id: ID;
  memberId: ID;
  at: number;
  feeling: CheckInFeeling;
  /** What they chose to try, if anything. */
  tried: IdeaKind | null;
  /** The ritual's text, when they tried one. */
  ritual?: string;
  helped: boolean | null;
}

export type SupportNeed =
  | 'did' | 'trauma' | 'low-cost' | 'medication' | 'substance' | 'dv' | 'sexual-assault'
  | 'lgbtq' | 'veterans' | 'youth' | 'family' | 'peer' | 'learn' | 'spanish';

export interface SupportProfile {
  /** US ZIP code (5 digits). */
  zip: string;
  needs: SupportNeed[];
}

export type ContactRole = 'therapist' | 'psychiatrist' | 'social-worker' | 'counselor' | 'crisis' | 'group' | 'doctor' | 'other';

/** A person or service someone has chosen to keep handy. */
export interface SupportContact {
  id: ID;
  /** Whose contact this is (a circle member). */
  memberId: ID;
  name: string;
  role: ContactRole;
  phone: string;
  email: string;
  website: string;
  address: string;
  notes: string;
  /** Show on the Pause screen for quick reach in hard moments. */
  pinned: boolean;
  createdAt: number;
}

export const CONTACT_ROLES: { value: ContactRole; label: string }[] = [
  { value: 'therapist', label: 'Therapist' },
  { value: 'counselor', label: 'Counsellor' },
  { value: 'social-worker', label: 'Social worker' },
  { value: 'psychiatrist', label: 'Psychiatrist' },
  { value: 'doctor', label: 'Doctor' },
  { value: 'crisis', label: 'Crisis service' },
  { value: 'group', label: 'Support group' },
  { value: 'other', label: 'Other' },
];

/** A part / alter / headmate within a tracked person's system. */
export interface Part {
  id: ID;
  /** Which tracked member's system this part belongs to. */
  memberId: ID;
  name: string;
  pronouns?: string;
  age?: string;
  role?: string;
  notes?: string;
  color: string;
  archived?: boolean;
  createdAt: number;
}

export type Duration = 'moments' | 'minutes' | 'under-hour' | 'hours' | 'day-plus' | 'unsure';

export interface FollowUp {
  id: ID;
  memberId: ID;
  text: string;
  createdAt: number;
}

export interface Entry {
  id: ID;
  /** Whose experience this is. */
  subjectId: ID;
  /** Who wrote it. */
  authorId: ID;
  occurredAt: number;
  loggedAt: number;
  updatedAt: number;
  /** Was the time of the event a best guess? */
  timeApprox: boolean;
  location: string;
  triggers: string[];
  /** 1 (very hard) .. 5 (settled) */
  mood: number | null;
  feelings: string[];
  /** Parts believed to be fronting / in control. */
  frontingPartIds: ID[];
  /** Unknown part / not sure who was fronting. */
  frontingUnknown: boolean;
  coFronting: boolean;
  coFrontPartIds: ID[];
  /** Lost time / memory gaps. */
  lostTime: boolean;
  possibleCause: string;
  duration: Duration | null;
  /** Circle members who may have noticed. */
  noticedByIds: ID[];
  /** Free-text names of people outside the circle who may have noticed. */
  noticedByOthers: string;
  intensity: number | null;
  notes: string;
  /** 'circle' = visible to circle members with view access; 'private' = subject only. */
  visibility: 'circle' | 'private';
  followUps: FollowUp[];
}

export type ObservationStatus = 'requested' | 'done' | 'dismissed';

/** A note from a circle member about an entry — either requested or offered. */
export interface Observation {
  id: ID;
  entryId: ID;
  memberId: ID;
  status: ObservationStatus;
  requestedAt: number;
  respondedAt?: number;
  noticed: string[];
  partIds: ID[];
  duration: Duration | null;
  text: string;
  /** Was the observer present? */
  present: boolean | null;
}

export type ThemeName = 'morning' | 'dusk' | 'meadow' | 'clear';
export type TextSize = 'small' | 'medium' | 'large' | 'xlarge';
export type PartWord = 'parts' | 'alters' | 'headmates' | 'selves';

/** Shared, encrypted circle preferences (synced). */
export interface Prefs {
  id: 'prefs';
  circleName: string;
  partWord: PartWord;
  customTriggers: string[];
  customLocations: string[];
  customFeelings: string[];
  showCheckIn: boolean;
}

/** Per-device comfort and notification settings (not sensitive, kept unencrypted so the lock screen can be styled). */
export interface DeviceSettings {
  theme: ThemeName;
  textSize: TextSize;
  reduceMotion: boolean;
  readableFont: boolean;
  softEdges: boolean;
  activeMemberId: ID | null;
  lastOpenedAt: number | null;
  notifyObservations: boolean;
  notifyAppointments: boolean;
  /** "HH:MM" local time for a daily check-in reminder, or null for off. */
  checkInTime: string | null;
  /** Lock the journal after the app has been hidden this many minutes (0 = immediately). */
  autoLockMins: number;
  /** Random gentle check-ins ("How are you doing?") through the day. */
  nudges: boolean;
  nudgesPerDay: number;
  /** No nudges between quietStart and quietEnd ("HH:MM", local time). */
  quietStart: string;
  quietEnd: string;
  /** Last app version this device has shown "What's new" for. */
  lastSeenVersion: string | null;
  /** Show badges and celebrate milestones. */
  badges: boolean;
  /** Occasionally suggest a feature that might help. */
  featureTips: boolean;
  /** The quick tour has been offered on this device. */
  tourOffered: boolean;
  /** Daily small act of kindness suggestion on Home. */
  kindActs: boolean;
  /** Medication reminders at the times set for each medication. */
  notifyMeds: boolean;
  /** What Quick hide shows: a calm blank screen or a plain notepad. */
  hideStyle: 'calm' | 'notes';
}

/** Combined view used by screens. */
export type Settings = Prefs & DeviceSettings;

export type AppointmentKind = 'therapy' | 'counseling' | 'support-group' | 'psychiatry' | 'medical' | 'other';
export type Recurrence = 'none' | 'weekly' | 'biweekly' | 'monthly';

export interface Appointment {
  id: ID;
  title: string;
  kind: AppointmentKind;
  startsAt: number;
  durationMin: number;
  location: string;
  notes: string;
  recurrence: Recurrence;
  /** Stop repeating after this time (inclusive), or null for open-ended. */
  until: number | null;
  /** Minutes before the start to remind, e.g. [60, 1440]. */
  reminderMins: number[];
  /** Circle members this appointment is for / who get reminders. */
  memberIds: ID[];
  createdBy: ID;
  createdAt: number;
}

export const APPOINTMENT_KINDS: { value: AppointmentKind; label: string }[] = [
  { value: 'therapy', label: 'Therapy' },
  { value: 'counseling', label: 'Counselling' },
  { value: 'support-group', label: 'Support group' },
  { value: 'psychiatry', label: 'Psychiatry / medication' },
  { value: 'medical', label: 'Medical' },
  { value: 'other', label: 'Other' },
];

export const DURATIONS: { value: Duration; label: string }[] = [
  { value: 'moments', label: 'A few moments' },
  { value: 'minutes', label: 'Some minutes' },
  { value: 'under-hour', label: 'Under an hour' },
  { value: 'hours', label: 'Hours' },
  { value: 'day-plus', label: 'A day or more' },
  { value: 'unsure', label: 'Not sure' },
];

export const ROLE_LABELS: Record<MemberRole, string> = {
  self: 'Me',
  partner: 'Partner',
  family: 'Family',
  friend: 'Friend',
  clinician: 'Clinician / therapist',
  other: 'Other support',
};

// ---------- 0.8.0: safety, inner board, check on me, body basics, comfort kit, therapy prep ----------

/** A personal safety plan for hard moments. One per person (id = `safety:<memberId>`). */
export interface SafetyPlan {
  id: ID;
  memberId: ID;
  /** Thoughts, feelings or situations that mean a crisis may be building. */
  warningSigns: string[];
  /** Things I can do on my own to feel a little better. */
  coping: string[];
  /** People and places that can take my mind off things. */
  distractions: string[];
  /** People I can ask for help: support contact ids. */
  helperContactIds: ID[];
  /** Professionals and services: support contact ids (crisis lines are always shown). */
  proContactIds: ID[];
  /** Making my surroundings safer. */
  safeSteps: string[];
  /** What matters to me and is worth staying for. */
  reasons: string[];
  /** Shared with the trust circle so they can help, or only me. */
  visibility: 'circle' | 'private';
  updatedAt: number;
}

/** A note on a system's inner message board, between parts. */
export interface BoardNote {
  id: ID;
  /** The tracked person whose system this board belongs to. */
  memberId: ID;
  /** Part who wrote it, or null when not sure / someone else. */
  fromPartId: ID | null;
  /** Parts it's for; empty = everyone. */
  toPartIds: ID[];
  text: string;
  pinned: boolean;
  done: boolean;
  /** Parts who have marked it as read: part id → ms. */
  seenBy: Record<ID, number>;
  createdAt: number;
}

export type CheckOnAsk = 'check' | 'call' | 'visit' | 'text';

/** "Check on me": a quiet request for someone to reach out. */
export interface CheckOnAlert {
  id: ID;
  fromMemberId: ID;
  toMemberIds: ID[];
  ask: CheckOnAsk;
  createdAt: number;
  /** Who's responding: member id → ms. */
  acks: Record<ID, number>;
  resolvedAt: number | null;
}

/** One day of body basics for one person (id = `body:<memberId>:<yyyy-mm-dd>`). */
export interface BodyDay {
  id: ID;
  memberId: ID;
  date: string;
  sleepHours: number | null;
  sleepQuality: number | null;
  meals: string[];
  water: number;
  /** Medication id → time taken (ms), for today's doses ("medId@HH:MM"). */
  medsTaken: Record<string, number>;
  movement: boolean;
  outside: boolean;
  notes: string;
}

export interface Medication {
  id: ID;
  memberId: ID;
  name: string;
  dose: string;
  /** Local times "HH:MM" to take it; empty = as needed. */
  times: string[];
  remind: boolean;
  notes: string;
  active: boolean;
  createdAt: number;
}

export type ComfortType = 'photo' | 'song' | 'quote' | 'scent' | 'activity' | 'letter' | 'place' | 'person';

export interface ComfortItem {
  id: ID;
  memberId: ID;
  type: ComfortType;
  title: string;
  text: string;
  url: string;
  /** Small JPEG data URL for photos (resized on the device). */
  image: string;
  /** For letters: which part wrote it. */
  fromPartId: ID | null;
  createdAt: number;
}

/** Preparing for (and remembering) a therapy or support session. */
export interface SessionPrep {
  id: ID;
  memberId: ID;
  appointmentId: ID | null;
  /** When the session is (or was). */
  sessionAt: number;
  /** Look back from this time (usually the previous session). */
  since: number;
  agenda: string[];
  questions: string[];
  wins: string[];
  entryIds: ID[];
  afterNotes: string;
  createdAt: number;
}

/** An invitation to join the online circle. Kept in the circle; the id matches the server's invite. */
export interface Invitation {
  id: ID;
  /** Who it's for, as the inviter wrote it. */
  name: string;
  /** The person in the circle it's for, so they're linked automatically when they join. */
  memberId: ID | null;
  role: 'member' | 'viewer';
  /** The full link, so it can be sent again. Useless once used, cancelled or expired. */
  link: string;
  /** Optional email or phone, used only to prefill "Remind" on the inviter's own device. */
  contact: string;
  createdBy: ID | null;
  createdAt: number;
  cancelledAt: number | null;
}

export type CareRole = 'therapist' | 'counselor' | 'psychiatrist' | 'doctor' | 'case-manager' | 'family' | 'friend' | 'other';
export const CARE_ROLES: { value: CareRole; label: string }[] = [
  { value: 'therapist', label: 'Therapist' }, { value: 'counselor', label: 'Counselor' }, { value: 'psychiatrist', label: 'Psychiatrist' },
  { value: 'doctor', label: 'Doctor' }, { value: 'case-manager', label: 'Case manager' }, { value: 'family', label: 'Family' },
  { value: 'friend', label: 'Friend' }, { value: 'other', label: 'Someone else' },
];

/** What a read-only shared view includes. */
export interface ShareScope {
  /** Totals, patterns and trends. */
  summary: boolean;
  /** The list of moments (when, where, triggers, mood, duration). */
  entries: boolean;
  /** Written notes and possible causes on each moment. */
  notes: boolean;
  /** What people in the circle noticed. */
  observations: boolean;
  /** Parts or alters, and who was fronting. */
  parts: boolean;
  /** Name, support needs and about-me details. */
  profile: boolean;
  /** Check-in moods over time. */
  checkins: boolean;
  safety: boolean;
  meds: boolean;
  appointments: boolean;
  /** Therapy prep notes. */
  prep: boolean;
  /** Include entries marked "only me". */
  privateEntries: boolean;
}

/** A read-only view shared with a therapist or another trusted person. The id matches the server's care_shares row. */
export interface CareShare {
  id: ID;
  /** The view's key (base64). It leaves the person's devices only inside the link they give. */
  key: string;
  name: string;
  role: CareRole;
  contact: string;
  /** Whose journal this view shows. */
  subjectId: ID;
  /** Set when this is someone in the circle who sees only selected information. */
  memberId: ID | null;
  scope: ShareScope;
  range: '30' | '90' | '365' | 'all';
  expiresAt: number | null;
  /** When the person explicitly agreed to share this. */
  consentedAt: number;
  createdAt: number;
  updatedAt: number;
  publishedAt: number | null;
  publishedHash: string;
}
