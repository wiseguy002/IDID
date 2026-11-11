import type { Entry, Part } from '../types';
import { countBy, durationLabel, timeOfDay } from './util';

export function computeStats(entries: Entry[], parts: Part[], mName: (id: string) => string) {
  const pName = (id: string) => parts.find((p) => p.id === id)?.name ?? 'Unknown';
  const moods = entries.filter((e) => e.mood != null).map((e) => e.mood!);
  const avgMood = moods.length ? moods.reduce((a, b) => a + b, 0) / moods.length : null;

  const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  const SLOTS = ['Night', 'Morning', 'Afternoon', 'Evening'];
  const heat = DAYS.map((d, di) => ({ day: d, slots: SLOTS.map((s) => entries.filter((e) => new Date(e.occurredAt).getDay() === di && timeOfDay(e.occurredAt) === s).length) }));
  const heatMax = Math.max(1, ...heat.flatMap((h) => h.slots));

  // Weekly mood: last 12 weeks
  const weeks: { label: string; avg: number | null; count: number }[] = [];
  const startOfWeek = (t: number) => { const d = new Date(t); d.setHours(0, 0, 0, 0); d.setDate(d.getDate() - d.getDay()); return d.getTime(); };
  const now = startOfWeek(Date.now());
  for (let i = 11; i >= 0; i--) {
    const s = now - i * 7 * 86400000, en = s + 7 * 86400000;
    const wk = entries.filter((e) => e.occurredAt >= s && e.occurredAt < en);
    const m = wk.filter((e) => e.mood != null).map((e) => e.mood!);
    weeks.push({ label: new Date(s).toLocaleDateString(undefined, { day: 'numeric', month: 'short' }), avg: m.length ? m.reduce((a, b) => a + b, 0) / m.length : null, count: wk.length });
  }

  // Which triggers tend to appear with which part
  const partTriggers = new Map<string, Map<string, number>>();
  for (const e of entries) for (const p of [...e.frontingPartIds, ...e.coFrontPartIds]) {
    const m = partTriggers.get(p) ?? new Map<string, number>();
    for (const t of e.triggers) m.set(t, (m.get(t) ?? 0) + 1);
    partTriggers.set(p, m);
  }
  const byPart = [...partTriggers.entries()].map(([pid, m]) => ({ part: parts.find((p) => p.id === pid), top: [...m.entries()].sort((a, b) => b[1] - a[1]).slice(0, 3) })).filter((x) => x.part && x.top.length);

  return {
    total: entries.length,
    avgMood,
    lostTimePct: entries.length ? Math.round((entries.filter((e) => e.lostTime).length / entries.length) * 100) : 0,
    coFrontPct: entries.length ? Math.round((entries.filter((e) => e.coFronting).length / entries.length) * 100) : 0,
    triggers: countBy(entries, (e) => e.triggers),
    locations: countBy(entries, (e) => e.location),
    feelings: countBy(entries, (e) => e.feelings),
    fronting: countBy(entries, (e) => [...e.frontingPartIds.map(pName), ...(e.frontingUnknown ? ['Not sure / unknown'] : [])]),
    durations: countBy(entries, (e) => (e.duration ? durationLabel(e.duration) : null)),
    noticed: countBy(entries, (e) => e.noticedByIds.map(mName)),
    heat, heatMax, weeks, byPart,
  };
}
export type Stats = ReturnType<typeof computeStats>;
