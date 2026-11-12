import { describe, expect, it } from 'vitest';
import { adherence, blankDay, dateKey, doseTimesBetween, sleepInsight } from './body';
import type { Entry, Medication } from '../types';

const med = (over: Partial<Medication> = {}): Medication => ({ id: 'm1', memberId: 'p', name: 'X', dose: '', times: ['08:00', '20:00'], remind: true, notes: '', active: true, createdAt: 0, ...over });

describe('body basics', () => {
  it('lists doses across days and skips inactive or as-needed medications', () => {
    const from = new Date(2026, 0, 1, 0, 0).getTime();
    const doses = doseTimesBetween([med(), med({ id: 'm2', active: false }), med({ id: 'm3', times: [] })], from, from + 2 * 86400000);
    expect(doses.map((d) => `${new Date(d.at).getDate()} ${d.slot}`)).toEqual(['1 08:00', '1 20:00', '2 08:00', '2 20:00']);
  });
  it('counts doses taken today', () => {
    const d = { ...blankDay('p', '2026-01-01'), medsTaken: { 'm1@08:00': 1 } };
    expect(adherence(d, [med()])).toEqual({ taken: 1, due: 2 });
    expect(adherence(undefined, [med({ createdAt: new Date(2026, 0, 3).getTime() })], '2026-01-01')).toEqual({ taken: 0, due: 0 });
  });
  it('compares moments on short-sleep and rested days only with enough data', () => {
    const days = ['01', '02', '03', '04', '05', '06'].map((n, i) => ({ ...blankDay('p', `2026-01-${n}`), sleepHours: i < 3 ? 5 : 8 }));
    const entries = [1, 1, 2, 2, 3, 4].map((d) => ({ occurredAt: new Date(2026, 0, d, 12).getTime() }) as Entry);
    expect(sleepInsight(days, entries)).toEqual({ short: 5 / 3, rested: 1 / 3, shortDays: 3, restedDays: 3 });
    expect(sleepInsight(days.slice(0, 4), entries)).toBeNull();
    expect(dateKey(new Date(2026, 0, 5))).toBe('2026-01-05');
  });
});
