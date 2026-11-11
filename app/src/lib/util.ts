import type { Entry, Member, Part, Duration, PartWord } from '../types';
import { DURATIONS, ROLE_LABELS } from '../types';
import { MOODS } from './defaults';

export const fmtDate = (t: number) =>
  new Date(t).toLocaleDateString(undefined, { weekday: 'short', day: 'numeric', month: 'short' });
export const fmtTime = (t: number) =>
  new Date(t).toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' });
export const fmtDateTime = (t: number) => `${fmtDate(t)}, ${fmtTime(t)}`;

export function relTime(t: number): string {
  const d = Date.now() - t;
  const m = Math.round(d / 60000);
  if (m < 1) return 'just now';
  if (m < 60) return `${m} min ago`;
  const h = Math.round(m / 60);
  if (h < 24) return `${h} hour${h === 1 ? '' : 's'} ago`;
  const days = Math.round(h / 24);
  if (days < 7) return `${days} day${days === 1 ? '' : 's'} ago`;
  return fmtDate(t);
}

/** yyyy-MM-ddTHH:mm in local time, for <input type="datetime-local"> */
export function toLocalInput(t: number) {
  const d = new Date(t);
  const p = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}T${p(d.getHours())}:${p(d.getMinutes())}`;
}

export const durationLabel = (d: Duration | null) => DURATIONS.find((x) => x.value === d)?.label ?? '—';
export const moodLabel = (m: number | null) => MOODS.find((x) => x.value === m)?.label ?? '—';
export const roleLabel = (m: Member) => ROLE_LABELS[m.role];

export function partWords(w: PartWord) {
  const singular: Record<PartWord, string> = { parts: 'part', alters: 'alter', headmates: 'headmate', selves: 'self' };
  return { one: singular[w], many: w, One: cap(singular[w]), Many: cap(w) };
}
export const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

export function greeting(name: string): string {
  const h = new Date().getHours();
  const part = h < 5 ? 'Hello' : h < 12 ? 'Good morning' : h < 17 ? 'Good afternoon' : h < 22 ? 'Good evening' : 'Hello';
  return name ? `${part}, ${name}` : part;
}

const WELCOMES = [
  "It's good to see you. Take whatever time you need.",
  'Welcome back. There is no wrong way to use this space.',
  "You're here, and that counts. Breathe when you're ready.",
  'Whatever today has been, you are welcome here.',
  'Nothing needs to be perfect. A few words are enough.',
  'Thank you for checking in with yourself — all of you.',
  'Go gently. You can stop at any time.',
];
export function welcomeLine(seed = new Date().getDate()): string {
  return WELCOMES[seed % WELCOMES.length];
}

export function sinceLast(last: number | null): string | null {
  if (!last) return null;
  const days = Math.floor((Date.now() - last) / 86400000);
  if (days >= 14) return "It's been a little while. Welcome back — no catching up required.";
  if (days >= 2) return `It's been ${days} days since you were last here.`;
  return null;
}


export function download(filename: string, content: string | Blob, type = 'text/plain') {
  const blob = typeof content === 'string' ? new Blob([content], { type }) : content;
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 2000);
}

const csvCell = (v: unknown) => {
  const s = v == null ? '' : String(v);
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
};

export function entriesToCsv(entries: Entry[], members: Member[], parts: Part[]) {
  const mName = (id: string) => members.find((m) => m.id === id)?.name ?? '';
  const pName = (id: string) => parts.find((p) => p.id === id)?.name ?? '';
  const head = [
    'occurred_at', 'time_approximate', 'person', 'logged_by', 'location', 'triggers', 'mood', 'feelings',
    'intensity', 'fronting', 'fronting_unknown', 'co_fronting', 'co_fronting_with', 'lost_time',
    'possible_cause', 'duration', 'noticed_by', 'noticed_by_others', 'notes', 'follow_ups',
  ];
  const rows = entries.map((e) => [
    new Date(e.occurredAt).toISOString(), e.timeApprox, mName(e.subjectId), mName(e.authorId), e.location,
    e.triggers.join('; '), e.mood ?? '', e.feelings.join('; '), e.intensity ?? '',
    e.frontingPartIds.map(pName).join('; '), e.frontingUnknown, e.coFronting, e.coFrontPartIds.map(pName).join('; '),
    e.lostTime, e.possibleCause, durationLabel(e.duration), e.noticedByIds.map(mName).join('; '),
    e.noticedByOthers, e.notes, e.followUps.map((f) => `${mName(f.memberId)}: ${f.text}`).join(' | '),
  ]);
  return [head, ...rows].map((r) => r.map(csvCell).join(',')).join('\n');
}

export function countBy<T>(items: T[], key: (t: T) => string[] | string | null | undefined) {
  const map = new Map<string, number>();
  for (const it of items) {
    const k = key(it);
    const ks = Array.isArray(k) ? k : k ? [k] : [];
    for (const x of ks) map.set(x, (map.get(x) ?? 0) + 1);
  }
  return [...map.entries()].sort((a, b) => b[1] - a[1]);
}

export function timeOfDay(t: number) {
  const h = new Date(t).getHours();
  if (h < 6) return 'Night';
  if (h < 12) return 'Morning';
  if (h < 18) return 'Afternoon';
  return 'Evening';
}
