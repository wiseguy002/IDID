import type { BodyDay, Entry, Medication } from '../types';

export const dateKey = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
export const bodyId = (memberId: string, date: string) => `body:${memberId}:${date}`;

export function blankDay(memberId: string, date: string): BodyDay {
  return { id: bodyId(memberId, date), memberId, date, sleepHours: null, sleepQuality: null, meals: [], water: 0, medsTaken: {}, movement: false, outside: false, notes: '' };
}

/** Each scheduled dose of each active medication in [from, to). */
export function doseTimesBetween(meds: Medication[], from: number, to: number): { medId: string; at: number; slot: string }[] {
  const out: { medId: string; at: number; slot: string }[] = [];
  for (const m of meds) {
    if (!m.active || !m.times.length) continue;
    const d = new Date(from); d.setHours(0, 0, 0, 0);
    while (d.getTime() < to) {
      for (const t of m.times) {
        const [h, mi] = t.split(':').map(Number);
        const at = new Date(d.getFullYear(), d.getMonth(), d.getDate(), h, mi).getTime();
        if (at >= from && at < to) out.push({ medId: m.id, at, slot: t });
      }
      d.setDate(d.getDate() + 1);
    }
  }
  return out.sort((a, b) => a.at - b.at);
}

/** Share of today's scheduled doses that were marked taken. */
export function adherence(day: BodyDay | undefined, meds: Medication[], date?: string): { taken: number; due: number } {
  // Only count medications that existed by the end of that day.
  const end = date ? new Date(date + 'T23:59:59').getTime() : Infinity;
  const relevant = meds.filter((m) => m.active && m.createdAt <= end);
  const due = relevant.reduce((n, m) => n + m.times.length, 0);
  const taken = day ? relevant.reduce((n, m) => n + m.times.filter((t) => day.medsTaken[`${m.id}@${t}`]).length, 0) : 0;
  return { taken, due };
}

/**
 * Compare how many moments were noted on short-sleep days vs rested days.
 * Needs at least 3 days in each group to say anything.
 */
export function sleepInsight(days: BodyDay[], entries: Entry[]): { short: number; rested: number; shortDays: number; restedDays: number } | null {
  const perDay = new Map<string, number>();
  for (const e of entries) { const k = dateKey(new Date(e.occurredAt)); perDay.set(k, (perDay.get(k) ?? 0) + 1); }
  const short = days.filter((d) => d.sleepHours != null && d.sleepHours < 6);
  const rested = days.filter((d) => d.sleepHours != null && d.sleepHours >= 7);
  if (short.length < 3 || rested.length < 3) return null;
  const avg = (ds: BodyDay[]) => ds.reduce((n, d) => n + (perDay.get(d.date) ?? 0), 0) / ds.length;
  return { short: avg(short), rested: avg(rested), shortDays: short.length, restedDays: rested.length };
}
