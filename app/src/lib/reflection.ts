import type { CheckIn, Entry, FrontLog, ID, Reflection } from '../types';

const DAY = 86400_000;

/** Local midnight on the Sunday that starts the week containing `t`. */
export function weekStart(t: number): number {
  const d = new Date(t); d.setHours(0, 0, 0, 0); d.setDate(d.getDate() - d.getDay());
  return d.getTime();
}

/** Offer the reflection from Saturday evening through Monday, once per week, if it's turned on. */
export function reflectionDue(on: boolean | undefined, reflections: Reflection[], memberId: ID, now = Date.now()): number | null {
  if (!on) return null;
  const d = new Date(now);
  const day = d.getDay(); // 0 Sunday
  const inWindow = day === 0 || day === 1 || (day === 6 && d.getHours() >= 17);
  if (!inWindow) return null;
  // The week being looked back on: the one that just ended (Sunday/Monday) or is ending (Saturday evening).
  const weekOf = day === 6 ? weekStart(now) : weekStart(now) - 7 * DAY;
  return reflections.some((r) => r.memberId === memberId && r.weekOf === weekOf) ? null : weekOf;
}

export interface WeekSummary {
  entries: number;
  hardest: number | null;
  settled: number;
  checkins: number;
  helped: number;
  fronts: number;
  /** A gentle line about the week, never a judgment. */
  line: string;
}

export function weekSummary(memberId: ID, weekOf: number, d: { entries: Entry[]; checkins: CheckIn[]; fronts: FrontLog[] }): WeekSummary {
  const end = weekOf + 7 * DAY;
  const inWeek = (t: number) => t >= weekOf && t < end;
  const es = d.entries.filter((e) => e.subjectId === memberId && inWeek(e.occurredAt));
  const moods = es.map((e) => e.mood).filter((m): m is number => m != null);
  const cs = d.checkins.filter((c) => c.memberId === memberId && inWeek(c.at));
  const fs = d.fronts.filter((f) => f.memberId === memberId && inWeek(f.at));
  const settled = moods.filter((m) => m >= 4).length;
  const helped = cs.filter((c) => c.helped).length;
  const line = !es.length && !cs.length && !fs.length
    ? 'A quiet week in iDID. Quiet is okay, and so is a week you just got through.'
    : helped ? `You found something that helped ${helped === 1 ? 'once' : `${helped} times`}. That's worth remembering.`
    : settled ? `There ${settled === 1 ? 'was a moment' : `were ${settled} moments`} that felt more settled.`
    : 'You kept noticing, even when it was hard. That takes care.';
  return { entries: es.length, hardest: moods.length ? Math.min(...moods) : null, settled, checkins: cs.length, helped, fronts: fs.length, line };
}
