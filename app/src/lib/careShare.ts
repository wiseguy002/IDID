/**
 * Read-only shared views for a therapist, counselor or anyone the person chooses.
 *
 * The person's device builds a summary of exactly what they chose (the scope), encrypts it with a
 * key that exists only in the link they hand over, and uploads the ciphertext. The viewer opens the
 * link, fetches the ciphertext and decrypts it in their browser. Nothing outside the scope is ever
 * put in the summary, so it can't leak, and removing access deletes it from the server.
 */
import { computeStats, type Stats } from './stats';
import { durationLabel, moodLabel } from './util';
import { decryptJson, encryptJson, fromB64, randomBytes, toB64 } from '../data/crypto';
import type {
  Appointment, CareRole, CareShare, CheckIn, Entry, Medication, Member, Observation, Part, SafetyPlan, SessionPrep, ShareScope, SupportContact,
} from '../types';
import { CARE_ROLES } from '../types';

export const SCOPE_ITEMS: { key: keyof ShareScope; label: string; hint: string }[] = [
  { key: 'summary', label: 'Patterns and trends', hint: 'Totals, usual mood, lost time, top triggers, places and feelings' },
  { key: 'entries', label: 'Moments I logged', hint: 'When and where, triggers, mood and how long it lasted' },
  { key: 'notes', label: 'My written notes', hint: 'The notes and possible causes on each moment' },
  { key: 'parts', label: 'Parts and fronting', hint: 'Names of parts and who was fronting' },
  { key: 'observations', label: 'What my circle noticed', hint: 'Notes people in my circle added' },
  { key: 'profile', label: 'About me', hint: 'My name, pronouns of parts, and the kinds of support I’m looking for' },
  { key: 'checkins', label: 'Check-in moods', hint: 'How I said I was doing over time' },
  { key: 'safety', label: 'My safety plan', hint: 'Warning signs, coping steps and reasons' },
  { key: 'meds', label: 'Medications', hint: 'Names, doses and times' },
  { key: 'appointments', label: 'Appointments', hint: 'Upcoming and recent sessions' },
  { key: 'prep', label: 'Therapy prep notes', hint: 'Agendas, questions and wins I prepared' },
  { key: 'privateEntries', label: 'Include “only me” moments', hint: 'Moments I kept private from my circle' },
];

const ALL_OFF: ShareScope = { summary: false, entries: false, notes: false, observations: false, parts: false, profile: false, checkins: false, safety: false, meds: false, appointments: false, prep: false, privateEntries: false };

/** A sensible starting point. The person reviews every item before agreeing. */
export function defaultScope(role: CareRole): ShareScope {
  if (['therapist', 'counselor', 'psychiatrist', 'doctor', 'case-manager'].includes(role)) {
    return { ...ALL_OFF, summary: true, entries: true, notes: true, observations: true, parts: true, profile: true, checkins: true, safety: true, meds: role === 'psychiatrist' || role === 'doctor', appointments: true, prep: role !== 'case-manager' };
  }
  return { ...ALL_OFF, summary: true, entries: true };
}

export const careRoleLabel = (r: CareRole) => CARE_ROLES.find((x) => x.value === r)?.label ?? 'Someone else';
export const RANGE_LABEL: Record<CareShare['range'], string> = { '30': 'Last 30 days', '90': 'Last 90 days', '365': 'Last 12 months', all: 'All time' };

export interface CareEntry {
  id: string; at: number; approx: boolean; location: string; triggers: string[]; mood: string; feelings: string[]; lostTime: boolean;
  duration: string; fronting?: string[]; coFronting?: boolean; notes?: string; cause?: string; noticed?: string[]; private?: boolean;
}
export interface CarePayload {
  v: 1;
  who: string;
  forName: string;
  forRole: CareRole;
  preparedAt: number;
  rangeLabel: string;
  scope: ShareScope;
  partWord: { one: string; many: string };
  stats?: Pick<Stats, 'total' | 'avgMood' | 'lostTimePct' | 'coFrontPct' | 'triggers' | 'locations' | 'feelings' | 'durations' | 'weeks'> & { fronting?: Stats['fronting'] };
  entries?: CareEntry[];
  profile?: { name: string; needs: string[]; parts?: { name: string; pronouns?: string; age?: string; role?: string }[] };
  checkins?: { at: number; feeling: string }[];
  safety?: { warningSigns: string[]; coping: string[]; distractions: string[]; helpers: string[]; pros: string[]; safeSteps: string[]; reasons: string[] };
  meds?: { name: string; dose: string; times: string[]; notes: string }[];
  appointments?: { title: string; kind: string; at: number; location: string }[];
  prep?: { sessionAt: number; agenda: string[]; questions: string[]; wins: string[]; afterNotes: string }[];
}

export interface CareData {
  members: Member[]; parts: Part[]; entries: Entry[]; observations: Observation[]; checkins: CheckIn[];
  safety: SafetyPlan[]; meds: Medication[]; appointments: Appointment[]; prep: SessionPrep[]; contacts: SupportContact[];
  partWord: { one: string; many: string };
}

const pick = <T,>(on: boolean, v: () => T): T | undefined => (on ? v() : undefined);

/** Build exactly what the scope allows, and nothing else. */
export function buildCarePayload(d: CareData, share: CareShare, now = Date.now()): CarePayload {
  const sc = share.scope;
  const subject = d.members.find((m) => m.id === share.subjectId);
  const since = share.range === 'all' ? 0 : now - Number(share.range) * 86400000;
  const name = (id: string) => d.members.find((m) => m.id === id)?.name ?? '';
  const ps = d.parts.filter((p) => p.memberId === share.subjectId);
  const pName = (id: string) => ps.find((p) => p.id === id)?.name ?? 'Unknown';
  const entries = d.entries
    .filter((e) => e.subjectId === share.subjectId && e.occurredAt >= since && (e.visibility !== 'private' || sc.privateEntries))
    .sort((a, b) => a.occurredAt - b.occurredAt);
  const obs = (id: string) => d.observations.filter((o) => o.entryId === id && o.status === 'done')
    .map((o) => `${name(o.memberId)} noticed: ${[...o.noticed, o.text].filter(Boolean).join('; ')}`);

  let stats: CarePayload['stats'];
  if (sc.summary) {
    const s = computeStats(entries, sc.parts ? ps : [], name);
    stats = { total: s.total, avgMood: s.avgMood, lostTimePct: s.lostTimePct, coFrontPct: s.coFrontPct, triggers: s.triggers, locations: s.locations, feelings: s.feelings, durations: s.durations, weeks: s.weeks, ...(sc.parts ? { fronting: s.fronting } : {}) };
  }
  const pro = (ids: string[]) => ids.map((id) => d.contacts.find((c) => c.id === id)?.name).filter((x): x is string => !!x);
  const plan = d.safety.find((p) => p.memberId === share.subjectId);
  return {
    v: 1, who: subject?.name ?? '', forName: share.name, forRole: share.role, preparedAt: now, rangeLabel: RANGE_LABEL[share.range], scope: sc, partWord: d.partWord,
    stats,
    entries: pick(sc.entries, () => entries.map((e): CareEntry => ({
      id: e.id, at: e.occurredAt, approx: e.timeApprox, location: e.location, triggers: e.triggers, mood: e.mood ? moodLabel(e.mood) : '',
      feelings: e.feelings, lostTime: e.lostTime, duration: e.duration ? durationLabel(e.duration) : '',
      ...(sc.parts ? { fronting: [...e.frontingPartIds.map(pName), ...(e.frontingUnknown ? ['not sure'] : [])], coFronting: e.coFronting } : {}),
      ...(sc.notes ? { notes: e.notes, cause: e.possibleCause } : {}),
      ...(sc.observations ? { noticed: obs(e.id) } : {}),
      ...(e.visibility === 'private' ? { private: true } : {}),
    }))),
    profile: pick(sc.profile, () => ({ name: subject?.name ?? '', needs: subject?.support?.needs ?? [], ...(sc.parts ? { parts: ps.filter((p) => !p.archived).map((p) => ({ name: p.name, pronouns: p.pronouns, age: p.age, role: p.role })) } : {}) })),
    checkins: pick(sc.checkins, () => d.checkins.filter((c) => c.memberId === share.subjectId && c.at >= since).sort((a, b) => a.at - b.at).map((c) => ({ at: c.at, feeling: c.feeling }))),
    safety: pick(sc.safety && !!plan, () => ({ warningSigns: plan!.warningSigns, coping: plan!.coping, distractions: plan!.distractions, helpers: pro(plan!.helperContactIds), pros: pro(plan!.proContactIds), safeSteps: plan!.safeSteps, reasons: plan!.reasons })),
    meds: pick(sc.meds, () => d.meds.filter((m) => m.memberId === share.subjectId && m.active).map((m) => ({ name: m.name, dose: m.dose, times: m.times, notes: m.notes }))),
    appointments: pick(sc.appointments, () => d.appointments.filter((a) => a.memberIds.includes(share.subjectId) && a.startsAt >= since).sort((a, b) => a.startsAt - b.startsAt).map((a) => ({ title: a.title, kind: a.kind, at: a.startsAt, location: a.location }))),
    prep: pick(sc.prep, () => d.prep.filter((p) => p.memberId === share.subjectId && p.sessionAt >= since).sort((a, b) => a.sessionAt - b.sessionAt).map((p) => ({ sessionAt: p.sessionAt, agenda: p.agenda, questions: p.questions, wins: p.wins, afterNotes: p.afterNotes }))),
  };
}

/** A fingerprint of the content (not the time it was prepared), to skip re-uploading unchanged views. */
export function payloadHash(p: CarePayload): string {
  const s = JSON.stringify({ ...p, preparedAt: 0 });
  let h = 0x811c9dc5;
  for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 0x01000193); }
  return (h >>> 0).toString(16) + ':' + s.length;
}

export const newShareKey = () => toB64(randomBytes(32));
const importKey = (b64: string) => crypto.subtle.importKey('raw', fromB64(b64), 'AES-GCM', false, ['encrypt', 'decrypt']);
export async function sealPayload(p: CarePayload, keyB64: string, id: string) { return encryptJson(await importKey(keyB64), p, `care:${id}`); }
export async function openPayload(ct: string, keyB64: string, id: string) { return decryptJson<CarePayload>(await importKey(keyB64), ct, `care:${id}`); }

/** The link to give: the key is after the #, so it never reaches the server. */
export function careLink(s: Pick<CareShare, 'id' | 'key'>, base = `${location.origin}${location.pathname}`) { return `${base}#care=${s.id}.${s.key}`; }
export function parseCareToken(hash: string): { id: string; key: string } | null {
  const m = /^#care=([0-9a-f-]{36})\.([A-Za-z0-9_-]{40,})$/.exec(hash);
  return m ? { id: m[1], key: m[2] } : null;
}

/** Plain-language list of what is shared, for the consent screen and the viewer. */
export function scopeSummary(sc: ShareScope): string[] {
  return SCOPE_ITEMS.filter((i) => sc[i.key] && i.key !== 'privateEntries').map((i) => i.label)
    .concat(sc.privateEntries && sc.entries ? ['including “only me” moments'] : []);
}
