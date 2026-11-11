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
}

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

export interface Settings {
  id: 'settings';
  onboarded: boolean;
  circleName: string;
  theme: ThemeName;
  textSize: TextSize;
  reduceMotion: boolean;
  readableFont: boolean;
  softEdges: boolean;
  partWord: PartWord;
  /** SHA-256 hash of PIN + salt, or null when no lock. */
  pinHash: string | null;
  pinSalt: string | null;
  lastOpenedAt: number | null;
  activeMemberId: ID | null;
  customTriggers: string[];
  customLocations: string[];
  customFeelings: string[];
  showCheckIn: boolean;
}

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
