import { describe, expect, it } from 'vitest';
import { sinceTime, whatIMissed, type MissedInput } from './missed';
import { reflectionDue, weekStart, weekSummary } from './reflection';
import type { Appointment, Entry } from '../types';

const H = 3600_000;
const NOW = new Date(2026, 10, 4, 15, 0).getTime(); // Wednesday 3pm

const entry = (id: string, at: number, subjectId = 'm'): Entry => ({
  id, subjectId, authorId: subjectId, occurredAt: at, loggedAt: at, updatedAt: at, timeApprox: false, location: '', triggers: [], mood: 2, feelings: [],
  frontingPartIds: [], frontingUnknown: false, coFronting: false, coFrontPartIds: [], lostTime: true, possibleCause: '', duration: null,
  noticedByIds: [], noticedByOthers: '', intensity: null, notes: '', visibility: 'circle', followUps: [],
});
const appt = (startsAt: number, memberIds: string[] = []): Appointment => ({
  id: `a${startsAt}`, title: 'Therapy', kind: 'therapy', startsAt, durationMin: 50, location: '', notes: '', recurrence: 'none', until: null, reminderMins: [], memberIds, createdBy: 'm', createdAt: 0,
});
const empty: MissedInput = { memberId: 'm', entries: [], fronts: [], board: [], appointments: [], observations: [], checkins: [], voice: [] };

describe('what did I miss', () => {
  it('turns choices into times', () => {
    expect(sinceTime('3h', NOW)).toBe(NOW - 3 * H);
    expect(sinceTime('today', NOW)).toBe(new Date(2026, 10, 4).getTime());
    expect(sinceTime('opened', NOW, NOW - 5 * H)).toBe(NOW - 5 * H);
    expect(sinceTime('opened', NOW, null)).toBe(NOW - 24 * H);
  });

  it('gathers what happened in the gap, for this person only', () => {
    const m = whatIMissed({ ...empty,
      entries: [entry('in', NOW - 2 * H), entry('before', NOW - 30 * H), entry('someone-else', NOW - H, 'x')],
      appointments: [appt(NOW - H), appt(NOW + 5 * H), appt(NOW - 2 * H, ['x'])],
      observations: [{ id: 'o', entryId: 'in', memberId: 'friend', status: 'done', requestedAt: NOW - 2 * H, respondedAt: NOW - H, noticed: [], partIds: [], duration: null, text: 'I saw', present: true }],
    }, NOW - 6 * H, NOW);
    expect(m.entries.map((e) => e.id)).toEqual(['in']);
    expect(m.past.map(([, t]) => t)).toEqual([NOW - H]);
    expect(m.upcoming.map(([, t]) => t)).toEqual([NOW + 5 * H]);
    expect(m.observations).toHaveLength(1);
    expect(m.empty).toBe(false);
  });

  it('says when nothing happened', () => {
    expect(whatIMissed(empty, NOW - H, NOW).empty).toBe(true);
  });
});

describe('weekly reflection', () => {
  const sunday = new Date(2026, 10, 8, 10, 0).getTime();
  it('is only offered when turned on, around the weekend, once a week', () => {
    expect(reflectionDue(false, [], 'm', sunday)).toBeNull();
    expect(reflectionDue(true, [], 'm', NOW)).toBeNull(); // Wednesday
    const weekOf = reflectionDue(true, [], 'm', sunday);
    expect(weekOf).toBe(weekStart(sunday) - 7 * 24 * H);
    expect(reflectionDue(true, [{ id: 'r', memberId: 'm', weekOf: weekOf!, helped: '', hard: '', hope: '', createdAt: 0 }], 'm', sunday)).toBeNull();
  });

  it('summarizes gently', () => {
    const weekOf = weekStart(NOW);
    const s = weekSummary('m', weekOf, { entries: [entry('e', NOW)], checkins: [{ id: 'c', memberId: 'm', at: NOW, feeling: 'okay', tried: 'breathe', helped: true }], fronts: [] });
    expect(s.entries).toBe(1);
    expect(s.helped).toBe(1);
    expect(s.line).toMatch(/helped once/);
    expect(weekSummary('m', weekOf, { entries: [], checkins: [], fronts: [] }).line).toMatch(/quiet week/i);
  });
});
