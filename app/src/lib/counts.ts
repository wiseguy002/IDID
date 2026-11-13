/**
 * Opt-in anonymous feature counts (off by default; Settings → Privacy).
 *
 * While it's on, this device keeps a tally of which screens were opened this week, using only the app's own
 * fixed screen names. Once a week the previous week's tally is sent with no account, device or circle id,
 * and the server only adds it to running totals (supabase/migrations/20261116000000_feature_counts.sql).
 * Nothing anyone writes is ever included. Turning it off deletes the tally.
 */
const KEY = 'idid.counts';
export const COUNTED: readonly string[] = [
  'home', 'log', 'timeline', 'entry', 'observe', 'insights', 'circle', 'share', 'settings', 'pause', 'appointments', 'account',
  'support', 'changelog', 'explore', 'kindness', 'feedback', 'safety', 'board', 'body', 'comfort', 'calm', 'prep', 'careteam',
  'help', 'garden', 'front', 'missed', 'voice', 'supporters', 'checkin', 'tour',
];

export interface Tally { week: string; counts: Record<string, number> }

/** ISO week, like "2026-W46". */
export function isoWeek(t: number): string {
  const d = new Date(t);
  const day = (d.getDay() + 6) % 7; // Monday = 0
  const thursday = new Date(d.getFullYear(), d.getMonth(), d.getDate() - day + 3);
  const firstThursday = new Date(thursday.getFullYear(), 0, 4);
  const week = 1 + Math.round(((thursday.getTime() - firstThursday.getTime()) / 86400000 - 3 + ((firstThursday.getDay() + 6) % 7)) / 7);
  return `${thursday.getFullYear()}-W${String(week).padStart(2, '0')}`;
}

type Storage = Pick<globalThis.Storage, 'getItem' | 'setItem' | 'removeItem'>;
const store = (): Storage | null => { try { return localStorage; } catch { return null; } };

export function readTally(s: Storage | null = store()): Tally | null {
  try { const v = JSON.parse(s?.getItem(KEY) ?? 'null'); return v && typeof v.week === 'string' ? v : null; } catch { return null; }
}

/** Count one use of a screen this week. Unknown names are ignored. */
export function countUse(name: string, now = Date.now(), s: Storage | null = store()) {
  if (!COUNTED.includes(name) || !s) return;
  const week = isoWeek(now);
  const t = readTally(s);
  let cur: Tally = { week, counts: {} };
  if (t && t.week === week) cur = t;
  // A finished week that hasn't been sent yet waits under its own key (only the most recent one is kept).
  else if (t && Object.keys(t.counts).length) s.setItem(`${KEY}.due`, JSON.stringify(t));
  cur.counts[name] = Math.min(200, (cur.counts[name] ?? 0) + 1);
  s.setItem(KEY, JSON.stringify(cur));
}

/** A finished week's tally that's ready to send, if any. */
export function takeDue(now = Date.now(), s: Storage | null = store()): Tally | null {
  if (!s) return null;
  try {
    const due = JSON.parse(s.getItem(`${KEY}.due`) ?? 'null') as Tally | null;
    if (due) return due;
    const t = readTally(s);
    return t && t.week < isoWeek(now) && Object.keys(t.counts).length ? t : null;
  } catch { return null; }
}

export function markSent(t: Tally, s: Storage | null = store()) {
  if (!s) return;
  s.removeItem(`${KEY}.due`);
  const cur = readTally(s);
  if (cur && cur.week === t.week) s.removeItem(KEY);
}

export function clearTally(s: Storage | null = store()) { s?.removeItem(KEY); s?.removeItem(`${KEY}.due`); }

/** Send last week's tally if there is one. Never throws; tries again next time if it fails. */
export async function sendDue(send: (t: Tally) => Promise<void>, now = Date.now(), s: Storage | null = store()) {
  const t = takeDue(now, s);
  if (!t) return false;
  try { await send(t); markSent(t, s); return true; } catch { return false; }
}
