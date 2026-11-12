import type { Appointment, Recurrence } from '../types';
import { APPOINTMENT_KINDS } from '../types';

const DAY = 86400000;

function step(t: number, r: Recurrence, n: number): number {
  if (r === 'weekly') return t + n * 7 * DAY;
  if (r === 'biweekly') return t + n * 14 * DAY;
  if (r === 'monthly') {
    const d = new Date(t);
    const day = d.getDate();
    d.setDate(1);
    d.setMonth(d.getMonth() + n);
    // Clamp to the month's last day (e.g. the 31st in a 30-day month).
    const last = new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate();
    d.setDate(Math.min(day, last));
    return d.getTime();
  }
  return t;
}

/** Start times of an appointment that fall in [from, to). */
export function occurrences(a: Appointment, from: number, to: number, limit = 500): number[] {
  const out: number[] = [];
  if (a.recurrence === 'none') return a.startsAt >= from && a.startsAt < to ? [a.startsAt] : [];
  // Skip ahead roughly for weekly kinds so long-running series stay cheap.
  let n = 0;
  if (a.recurrence !== 'monthly' && from > a.startsAt) {
    const period = (a.recurrence === 'weekly' ? 7 : 14) * DAY;
    n = Math.max(0, Math.floor((from - a.startsAt) / period) - 1);
  }
  for (let i = 0; out.length < limit && i < 2000; i++, n++) {
    const t = step(a.startsAt, a.recurrence, n);
    if (a.until != null && t > a.until) break;
    if (t >= to) break;
    if (t >= from) out.push(t);
  }
  return out;
}

export function nextOccurrence(a: Appointment, now = Date.now()): number | null {
  // Include sessions that are in progress.
  return occurrences(a, now - a.durationMin * 60000, now + 400 * DAY, 1)[0] ?? null;
}

export function previousOccurrence(a: Appointment, now = Date.now()): number | null {
  const past = occurrences(a, now - 400 * DAY, now);
  return past.length ? past[past.length - 1] : null;
}

export interface DueReminder { appointmentId: string; occursAt: number; fireAt: number; minutesBefore: number }

/** All reminders that should fire in [from, to). */
export function remindersBetween(appts: Appointment[], from: number, to: number): DueReminder[] {
  const out: DueReminder[] = [];
  for (const a of appts) {
    const maxLead = Math.max(0, ...a.reminderMins) * 60000;
    for (const occ of occurrences(a, from, to + maxLead)) {
      for (const m of a.reminderMins) {
        const fireAt = occ - m * 60000;
        if (fireAt >= from && fireAt < to) out.push({ appointmentId: a.id, occursAt: occ, fireAt, minutesBefore: m });
      }
    }
  }
  return out.sort((x, y) => x.fireAt - y.fireAt);
}

/** Next daily check-in times ("HH:MM", local) in [from, to). */
export function checkInTimes(hhmm: string | null, from: number, to: number): number[] {
  if (!hhmm) return [];
  const [h, m] = hhmm.split(':').map(Number);
  const out: number[] = [];
  const d = new Date(from);
  d.setHours(h, m, 0, 0);
  if (d.getTime() < from) d.setDate(d.getDate() + 1);
  while (d.getTime() < to) { out.push(d.getTime()); d.setDate(d.getDate() + 1); }
  return out;
}

export function kindLabel(a: Pick<Appointment, 'kind'>) {
  return APPOINTMENT_KINDS.find((k) => k.value === a.kind)?.label ?? 'Appointment';
}

export function recurrenceLabel(r: Recurrence) {
  return { none: 'One time', weekly: 'Every week', biweekly: 'Every 2 weeks', monthly: 'Every month' }[r];
}

export function leadLabel(mins: number) {
  if (mins === 0) return 'At the start';
  if (mins < 60) return `${mins} min before`;
  if (mins < 1440) return `${mins / 60} hour${mins === 60 ? '' : 's'} before`;
  return `${mins / 1440} day${mins === 1440 ? '' : 's'} before`;
}

// ---------- Calendar export ----------

const icsDate = (t: number) => new Date(t).toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '');
const icsText = (s: string) => s.replace(/\\/g, '\\\\').replace(/;/g, '\;').replace(/,/g, '\\,').replace(/\r?\n/g, '\\n');

/** Folds lines to 75 octets as RFC 5545 requires. */
function fold(line: string) {
  const out: string[] = [];
  let cur = '';
  for (const ch of line) {
    if (new TextEncoder().encode(cur + ch).length > 74) { out.push(cur); cur = ' ' + ch; } else cur += ch;
  }
  out.push(cur);
  return out.join('\r\n');
}

function rrule(a: Appointment) {
  if (a.recurrence === 'none') return null;
  const base = a.recurrence === 'monthly' ? 'FREQ=MONTHLY' : `FREQ=WEEKLY;INTERVAL=${a.recurrence === 'biweekly' ? 2 : 1}`;
  return a.until ? `${base};UNTIL=${icsDate(a.until)}` : base;
}

export interface CalendarOptions { neutralTitle: boolean; includeNotes: boolean }

export function calendarTitle(a: Appointment, o: CalendarOptions) {
  return o.neutralTitle ? 'Appointment' : a.title || kindLabel(a);
}

export function toIcs(a: Appointment, o: CalendarOptions, now = Date.now()): string {
  const lines = [
    'BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//iDID//Gentle Journal//EN', 'CALSCALE:GREGORIAN', 'METHOD:PUBLISH',
    'BEGIN:VEVENT',
    `UID:${a.id}@idid.app`,
    `DTSTAMP:${icsDate(now)}`,
    `DTSTART:${icsDate(a.startsAt)}`,
    `DTEND:${icsDate(a.startsAt + a.durationMin * 60000)}`,
    `SUMMARY:${icsText(calendarTitle(a, o))}`,
  ];
  if (a.location) lines.push(`LOCATION:${icsText(a.location)}`);
  if (o.includeNotes && a.notes) lines.push(`DESCRIPTION:${icsText(a.notes)}`);
  const r = rrule(a);
  if (r) lines.push(`RRULE:${r}`);
  for (const m of a.reminderMins) {
    lines.push('BEGIN:VALARM', 'ACTION:DISPLAY', `DESCRIPTION:${icsText(calendarTitle(a, o))}`, `TRIGGER:-PT${m}M`, 'END:VALARM');
  }
  lines.push('END:VEVENT', 'END:VCALENDAR');
  return lines.map(fold).join('\r\n') + '\r\n';
}

export function googleCalendarUrl(a: Appointment, o: CalendarOptions): string {
  const p = new URLSearchParams({
    action: 'TEMPLATE',
    text: calendarTitle(a, o),
    dates: `${icsDate(a.startsAt)}/${icsDate(a.startsAt + a.durationMin * 60000)}`,
  });
  if (a.location) p.set('location', a.location);
  if (o.includeNotes && a.notes) p.set('details', a.notes);
  const r = rrule(a);
  if (r) p.set('recur', `RRULE:${r}`);
  return `https://calendar.google.com/calendar/render?${p.toString()}`;
}
