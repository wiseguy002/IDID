import { describe, expect, it } from 'vitest';
import type { Appointment } from '../types';
import { checkInTimes, googleCalendarUrl, nextOccurrence, occurrences, remindersBetween, toIcs } from './schedule';

const H = 3600000, D = 24 * H;
const base = (over: Partial<Appointment> = {}): Appointment => ({
  id: 'a1', title: 'Session with Dr. Lee', kind: 'therapy', startsAt: Date.UTC(2026, 0, 5, 15), durationMin: 50,
  location: 'Room 4, Main St', notes: 'Bring journal', recurrence: 'weekly', until: null, reminderMins: [60, 1440],
  memberIds: ['m1'], createdBy: 'm1', createdAt: 0, ...over,
});

describe('occurrences', () => {
  it('handles weekly, biweekly, until and one-off', () => {
    const a = base();
    expect(occurrences(a, a.startsAt, a.startsAt + 22 * D)).toHaveLength(4);
    expect(occurrences(base({ recurrence: 'biweekly' }), a.startsAt, a.startsAt + 29 * D)).toHaveLength(3);
    expect(occurrences(base({ until: a.startsAt + 8 * D }), a.startsAt, a.startsAt + 60 * D)).toHaveLength(2);
    expect(occurrences(base({ recurrence: 'none' }), 0, Infinity)).toEqual([a.startsAt]);
  });
  it('clamps monthly to the end of short months', () => {
    const a = base({ recurrence: 'monthly', startsAt: new Date(2026, 0, 31, 10).getTime() });
    const days = occurrences(a, 0, new Date(2026, 4, 1).getTime()).map((t) => new Date(t).getDate());
    expect(days).toEqual([31, 28, 31, 30]);
  });
  it('finds the next session far into a series', () => {
    const a = base();
    expect(nextOccurrence(a, a.startsAt + 100 * D + H)).toBe(a.startsAt + 105 * D);
  });
});

describe('reminders', () => {
  it('lists reminders due in a window, in order', () => {
    const a = base();
    const r = remindersBetween([a], a.startsAt - 2 * D, a.startsAt + 1);
    expect(r.map((x) => x.minutesBefore)).toEqual([1440, 60]);
    expect(r[1].fireAt).toBe(a.startsAt - H);
  });
  it('makes daily check-ins', () => {
    const from = new Date(2026, 2, 1, 21, 0).getTime();
    const t = checkInTimes('20:30', from, from + 3 * D);
    expect(t).toHaveLength(3);
    expect(new Date(t[0]).getDate()).toBe(2);
  });
});

describe('calendar export', () => {
  it('writes a valid, private-by-default ICS', () => {
    const ics = toIcs(base(), { neutralTitle: true, includeNotes: false }, 0);
    expect(ics).toContain('SUMMARY:Appointment');
    expect(ics).not.toContain('Dr. Lee');
    expect(ics).not.toContain('Bring journal');
    expect(ics).toContain('RRULE:FREQ=WEEKLY;INTERVAL=1');
    expect(ics).toContain('TRIGGER:-PT1440M');
    expect(ics).toContain('LOCATION:Room 4\\, Main St');
    expect(ics.split('\r\n').every((l) => new TextEncoder().encode(l).length <= 75)).toBe(true);
  });
  it('builds a Google Calendar link', () => {
    const u = new URL(googleCalendarUrl(base({ recurrence: 'biweekly' }), { neutralTitle: false, includeNotes: true }));
    expect(u.searchParams.get('text')).toBe('Session with Dr. Lee');
    expect(u.searchParams.get('dates')).toBe('20260105T150000Z/20260105T155000Z');
    expect(u.searchParams.get('recur')).toBe('RRULE:FREQ=WEEKLY;INTERVAL=2');
  });
});
