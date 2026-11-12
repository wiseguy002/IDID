import { describe, expect, it } from 'vitest';
import { BADGES, FEATURES, emptyActivity, nextTip, progress, recordEvent, type Facts } from './progress';

const none: Facts = { entries: 0, reflections: 0, parts: 0, circlePeople: 0, observationsGiven: 0, checkins: 0, helped: 0, rituals: 0, supportProfile: false, safetyPlan: false, boardNotes: 0, bodyDays: 0, meds: 0, comfortItems: 0, preps: 0, checkOnSent: 0, contacts: 0, appointments: 0, online: false, notifications: false };
const DAY = 86400000;

describe('explore progress', () => {
  it('has unique ids', () => {
    expect(new Set(FEATURES.map((f) => f.id)).size).toBe(FEATURES.length);
    expect(new Set(BADGES.map((b) => b.id)).size).toBe(BADGES.length);
  });
  it('counts used features from data and events', () => {
    let a = emptyActivity('m');
    expect(progress(none, a).used).toHaveLength(0);
    a = recordEvent(recordEvent(a, 'pause', 5), 'pause', 9);
    expect(a.counts.pause).toBe(2);
    expect(a.firsts.pause).toBe(5);
    const p = progress({ ...none, entries: 12 }, a);
    expect(p.used.map((x) => x.id).sort()).toEqual(['log', 'pause']);
    expect(p.earned.map((b) => b.id).sort()).toEqual(['first-note', 'pause', 'steady']);
  });
  it('announces a badge only once', () => {
    const a = emptyActivity('m');
    expect(progress({ ...none, entries: 1 }, a).newBadges.map((b) => b.id)).toEqual(['first-note']);
    expect(progress({ ...none, entries: 1 }, { ...a, badges: { 'first-note': 1 } }).newBadges).toHaveLength(0);
  });
  it('suggests gently: not at first, weekly at most, most helpful first, respects dismissals', () => {
    const a = emptyActivity('m');
    const start = 0;
    expect(nextTip(none, a, start, 1 * DAY)).toBeNull();
    expect(nextTip(none, a, start, 3 * DAY)?.id).toBe('log');
    expect(nextTip({ ...none, entries: 3 }, a, start, 3 * DAY)?.id).toBe('pause');
    expect(nextTip(none, { ...a, lastTipAt: 2 * DAY }, start, 6 * DAY)).toBeNull();
    expect(nextTip(none, { ...a, lastTipAt: 2 * DAY, dismissedTips: ['log'] }, start, 10 * DAY)?.id).toBe('pause');
  });
});
