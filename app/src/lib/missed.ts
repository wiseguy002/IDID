import type { Appointment, BoardNote, CheckIn, Entry, FrontLog, ID, Observation, VoiceNote } from '../types';
import { occurrences } from './schedule';

const HOUR = 3600_000;

export type SinceChoice = 'opened' | '3h' | 'today' | 'yesterday' | 'week' | 'custom';

/** Turn a "since when?" choice into a time. `opened` falls back to 24 hours ago when unknown. */
export function sinceTime(choice: SinceChoice, now = Date.now(), opened: number | null = null, custom: number | null = null): number {
  const midnight = new Date(now); midnight.setHours(0, 0, 0, 0);
  switch (choice) {
    case 'opened': return opened && opened < now ? opened : now - 24 * HOUR;
    case '3h': return now - 3 * HOUR;
    case 'today': return midnight.getTime();
    case 'yesterday': return midnight.getTime() - 24 * HOUR;
    case 'week': return now - 7 * 24 * HOUR;
    case 'custom': return custom && custom < now ? custom : now - 24 * HOUR;
  }
}

export interface MissedInput {
  memberId: ID;
  entries: Entry[];
  fronts: FrontLog[];
  board: BoardNote[];
  appointments: Appointment[];
  observations: Observation[];
  checkins: CheckIn[];
  voice: VoiceNote[];
}

export interface Missed {
  entries: Entry[];
  fronts: FrontLog[];
  board: BoardNote[];
  /** Appointments that were scheduled during the gap: [appointment, time]. */
  past: [Appointment, number][];
  /** Appointments in the next 48 hours. */
  upcoming: [Appointment, number][];
  observations: Observation[];
  checkins: CheckIn[];
  voice: VoiceNote[];
  /** Nothing at all happened in iDID during the gap. */
  empty: boolean;
}

/** Everything in iDID that happened between `since` and `now` for one person, oldest first. */
export function whatIMissed(d: MissedInput, since: number, now = Date.now()): Missed {
  const inGap = (t: number | undefined) => !!t && t >= since && t <= now;
  const forMe = (a: Appointment) => !a.memberIds.length || a.memberIds.includes(d.memberId);
  const byTime = <T,>(f: (x: T) => number) => (a: T, b: T) => f(a) - f(b);
  const appts = d.appointments.filter(forMe);
  const mine = new Set(d.entries.filter((e) => e.subjectId === d.memberId).map((e) => e.id));
  const past = appts.flatMap((a) => occurrences(a, since, now).map((t) => [a, t] as [Appointment, number])).sort((a, b) => a[1] - b[1]);
  const upcoming = appts.flatMap((a) => occurrences(a, now, now + 48 * HOUR).map((t) => [a, t] as [Appointment, number])).sort((a, b) => a[1] - b[1]).slice(0, 5);
  const m: Missed = {
    entries: d.entries.filter((e) => (e.subjectId === d.memberId || e.authorId === d.memberId) && (inGap(e.loggedAt) || inGap(e.occurredAt))).sort(byTime((e) => e.occurredAt)),
    fronts: d.fronts.filter((f) => f.memberId === d.memberId && inGap(f.at)).sort(byTime((f) => f.at)),
    board: d.board.filter((n) => n.memberId === d.memberId && inGap(n.createdAt)).sort(byTime((n) => n.createdAt)),
    past,
    upcoming,
    observations: d.observations.filter((o) => o.status === 'done' && mine.has(o.entryId) && o.memberId !== d.memberId && inGap(o.respondedAt)).sort(byTime((o) => o.respondedAt ?? 0)),
    checkins: d.checkins.filter((c) => c.memberId === d.memberId && inGap(c.at)).sort(byTime((c) => c.at)),
    voice: d.voice.filter((v) => v.memberId === d.memberId && inGap(v.createdAt)).sort(byTime((v) => v.createdAt)),
    empty: false,
  };
  m.empty = !m.entries.length && !m.fronts.length && !m.board.length && !m.past.length && !m.observations.length && !m.checkins.length && !m.voice.length;
  return m;
}
