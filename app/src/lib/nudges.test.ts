import { describe, expect, it } from 'vitest';
import { awakeWindow, nudgeTimesBetween, nudgeTimesForDay, outsideIdea, ritualIdea } from './nudges';

const day = new Date(2026, 5, 10, 13, 0);

describe('nudge timing', () => {
  it('is stable for a person and day, and differs between people', () => {
    const a = nudgeTimesForDay('m1', day, 3, '21:00', '09:00');
    expect(nudgeTimesForDay('m1', new Date(2026, 5, 10, 22, 0), 3, '21:00', '09:00')).toEqual(a);
    expect(nudgeTimesForDay('m2', day, 3, '21:00', '09:00')).not.toEqual(a);
  });
  it('never falls in quiet hours and keeps nudges apart', () => {
    for (let d = 1; d <= 60; d++) {
      const ts = nudgeTimesForDay('person', new Date(2026, 0, d), 3, '21:00', '09:00');
      expect(ts).toHaveLength(3);
      for (const t of ts) {
        const h = new Date(t).getHours() + new Date(t).getMinutes() / 60;
        expect(h).toBeGreaterThanOrEqual(9);
        expect(h).toBeLessThan(21);
      }
      for (let i = 1; i < ts.length; i++) expect(ts[i] - ts[i - 1]).toBeGreaterThan(60 * 60000);
    }
  });
  it('handles quiet hours that do not cross midnight, and short windows', () => {
    expect(awakeWindow('01:00', '07:30')).toEqual([450, 1440]);
    expect(nudgeTimesForDay('p', day, 3, '11:20', '11:00')).toHaveLength(0); // 20-minute window: none
    expect(nudgeTimesForDay('p', day, 3, '12:00', '11:00')).toHaveLength(1); // 1 hour: one
  });
  it('lists nudges across days', () => {
    const from = new Date(2026, 5, 10, 0, 0).getTime();
    expect(nudgeTimesBetween('p', from, from + 7 * 86400000, 2, '21:00', '09:00')).toHaveLength(14);
  });
});

describe('ideas', () => {
  it('suits fresh-air ideas to the time of day', () => {
    expect(outsideIdea(new Date(2026, 5, 10, 8)).title).toMatch(/morning/i);
    expect(outsideIdea(new Date(2026, 5, 10, 14)).title).toMatch(/sunshine/i);
    expect(outsideIdea(new Date(2026, 5, 10, 23)).title).toMatch(/night/i);
  });
  it("uses the person's own rituals when they have some", () => {
    expect(ritualIdea(['Pet the cat'], 0.9)).toBe('Pet the cat');
    expect(ritualIdea([], 0)).toBeTruthy();
  });
});
