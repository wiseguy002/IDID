import type { BoardNote, FrontLog, ID } from '../types';

const HOUR = 3600_000;
const DAY = 24 * HOUR;
/** A front is counted for at most this long when nothing newer was logged, so a forgotten log doesn't fill the week. */
export const MAX_FRONT_MS = 12 * HOUR;

export const sortFronts = (logs: FrontLog[]) => [...logs].sort((a, b) => a.at - b.at);

/** The most recent "who's here" for a person, or null. */
export function currentFront(logs: FrontLog[], memberId: ID): FrontLog | null {
  let best: FrontLog | null = null;
  for (const l of logs) if (l.memberId === memberId && (!best || l.at > best.at)) best = l;
  return best;
}

export type TimeBucket = 'night' | 'morning' | 'afternoon' | 'evening';
export const BUCKET_LABEL: Record<TimeBucket, string> = { night: 'at night', morning: 'in the morning', afternoon: 'in the afternoon', evening: 'in the evening' };
export function bucket(t: number): TimeBucket {
  const h = new Date(t).getHours();
  return h < 5 ? 'night' : h < 12 ? 'morning' : h < 17 ? 'afternoon' : h < 22 ? 'evening' : 'night';
}

export interface FrontPatterns {
  /** Number of logs in the window. */
  logs: number;
  /** Approximate time in front per part id ('?' = not sure who), in ms. */
  time: Record<string, number>;
  /** When each part most often arrives. */
  usualTime: Record<string, TimeBucket>;
  /** Most common hand-overs, most frequent first. */
  switches: { from: string; to: string; count: number }[];
  /** How many logs were marked blurry. */
  blurry: number;
}

const who = (l: FrontLog) => (l.partIds[0] ?? (l.unknown ? '?' : '?'));

/** Gentle patterns for one person over the last `days` days. Pure: pass `now` in tests. */
export function frontPatterns(all: FrontLog[], memberId: ID, days = 30, now = Date.now()): FrontPatterns {
  const from = now - days * DAY;
  const logs = sortFronts(all.filter((l) => l.memberId === memberId && l.at <= now));
  const inWindow = logs.filter((l) => l.at >= from);
  const time: Record<string, number> = {};
  const arrivals: Record<string, Record<TimeBucket, number>> = {};
  const pairs: Record<string, number> = {};

  for (let i = 0; i < logs.length; i++) {
    const l = logs[i];
    const end = Math.min(logs[i + 1]?.at ?? now, l.at + MAX_FRONT_MS, now);
    const start = Math.max(l.at, from);
    if (end > start) for (const id of l.partIds.length ? l.partIds : ['?']) time[id] = (time[id] ?? 0) + (end - start);
    if (l.at < from) continue;
    const w = who(l);
    (arrivals[w] ??= { night: 0, morning: 0, afternoon: 0, evening: 0 })[bucket(l.at)]++;
    const prev = logs[i - 1];
    if (prev && l.at - prev.at <= DAY) {
      const p = who(prev);
      if (p !== w) pairs[`${p}>${w}`] = (pairs[`${p}>${w}`] ?? 0) + 1;
    }
  }

  const usualTime: Record<string, TimeBucket> = {};
  for (const [id, b] of Object.entries(arrivals)) {
    const top = (Object.entries(b) as [TimeBucket, number][]).sort((x, y) => y[1] - x[1])[0];
    if (top[1] >= 2) usualTime[id] = top[0];
  }
  const switches = Object.entries(pairs)
    .map(([k, count]) => { const [f, t] = k.split('>'); return { from: f, to: t, count }; })
    .sort((a, b) => b.count - a.count || a.from.localeCompare(b.from))
    .slice(0, 5);
  return { logs: inWindow.length, time, usualTime, switches, blurry: inWindow.filter((l) => l.blurry).length };
}

/** Inner-board notes waiting for any of these parts: addressed to them by name, not finished, and not yet marked seen by them. */
export function notesWaiting(notes: BoardNote[], memberId: ID, partIds: ID[]): BoardNote[] {
  if (!partIds.length) return [];
  return notes
    .filter((n) => n.memberId === memberId && !n.done && n.toPartIds.some((p) => partIds.includes(p) && !n.seenBy[p]))
    .sort((a, b) => Number(b.pinned) - Number(a.pinned) || b.createdAt - a.createdAt);
}

/** "about 3 hours", "40 minutes": rough on purpose. */
export function roughDuration(ms: number): string {
  const min = Math.round(ms / 60_000);
  if (ms < 60_000) return 'a moment';
  if (min < 60) return `${min} minute${min === 1 ? '' : 's'}`;
  const h = Math.round(ms / HOUR);
  if (h < 48) return `about ${h} hour${h === 1 ? '' : 's'}`;
  return `about ${Math.round(ms / DAY)} days`;
}
