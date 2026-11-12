import { describe, expect, it } from 'vitest';
import { buildGarden, careIdeas, careSoFar, describeGrowth, growthFrom, PLANTS, seasonFor, suggestPlant, weatherFrom, type GardenInput } from './garden';
import type { CheckIn, CheckInFeeling, Entry, Member, Part } from '../types';

const DAY = 86400000, NOW = Date.UTC(2026, 10, 12, 12);
const me = (over: Partial<Member> = {}): Member => ({ id: 'sam', name: 'Sam', role: 'self', tracked: true, canView: true, canObserve: true, color: '#888', createdAt: 0, ...over });
const part = (id: string, over: Partial<Part> = {}): Part => ({ id, memberId: 'sam', name: id, color: '#999', createdAt: 0, ...over });
const entry = (id: string, fronting: string[], over: Partial<Entry> = {}): Entry => ({
  id, subjectId: 'sam', authorId: 'sam', occurredAt: NOW, loggedAt: NOW, updatedAt: NOW, timeApprox: false, location: '', triggers: [], mood: null, feelings: [],
  frontingPartIds: fronting, frontingUnknown: false, coFronting: false, coFrontPartIds: [], lostTime: false, possibleCause: '', duration: null,
  noticedByIds: [], noticedByOthers: '', intensity: null, notes: '', visibility: 'circle', followUps: [], ...over,
});
const ci = (feeling: CheckInFeeling, daysAgo: number, memberId = 'sam'): CheckIn => ({ id: `${feeling}${daysAgo}${Math.random()}`, memberId, at: NOW - daysAgo * DAY, feeling, tried: null, helped: null });
const input = (over: Partial<GardenInput> = {}): GardenInput => ({ me: me(), parts: [], entries: [], checkins: [], observations: [], activity: undefined, boardNotes: [], comfort: [], bodyDays: 0, ...over });

describe('Mood Garden', () => {
  it('gives one plant per part, growing from moments that part was fronting', () => {
    const g = buildGarden(input({
      parts: [part('river', { role: 'little one' }), part('ash', { role: 'protector' }), part('juniper', { archived: true })],
      entries: [entry('e1', ['river']), entry('e2', ['river']), entry('e3', ['ash'])],
    }));
    expect(g.map((p) => p.owner)).toEqual(['river', 'ash', 'juniper']);
    expect(g[0].growth.why.moment).toBe(2);
    expect(g[1].growth.why.moment).toBe(1);
    expect(g[0].growth.points).toBeGreaterThan(g[1].growth.points);
    expect(g[2].resting).toBe(true);
    // Suggested plants follow the part's role until someone chooses
    expect(g[0].kind).toBe('wildflower');
    expect(g[1].kind).toBe('cactus');
  });

  it('shares care for the whole system with every part', () => {
    const g = buildGarden(input({ parts: [part('a'), part('b')], activity: { id: 'sam', firsts: {}, counts: { pause: 4, 'kind-act': 2 }, badges: {}, dismissedTips: [], lastTipAt: 0 } as never }));
    expect(g[0].growth.why.pause).toBe(2);
    expect(g[1].growth.why.kind).toBe(1);
  });

  it('never shrinks a plant, and hard days make it grow', () => {
    const calm = buildGarden(input({ checkins: [ci('good', 1), ci('okay', 2)] }))[0].growth.points;
    const hard = buildGarden(input({ checkins: [ci('struggling', 1), ci('struggling', 2)] }))[0].growth.points;
    expect(hard).toBeGreaterThan(calm);
    // More care only ever adds; time passing does nothing.
    const later = buildGarden(input({ checkins: [ci('good', 40), ci('okay', 41)] }))[0].growth.points;
    expect(later).toBe(calm);
  });

  it('gives family members a garden of their own from the care they give', () => {
    const mom = me({ id: 'mom', name: 'Mom', tracked: false, plant: { kind: 'oak', name: 'Old Faithful' } });
    const [p] = buildGarden(input({
      me: mom, parts: [part('river')], checkins: [ci('okay', 1, 'mom')],
      observations: [{ id: 'o1', entryId: 'e', memberId: 'mom', status: 'done', requestedAt: 1, noticed: [], partIds: [], duration: null, text: '', present: true }],
    }));
    expect(p).toMatchObject({ owner: 'Mom', kind: 'oak', name: 'Old Faithful' });
    expect(p.growth.why).toMatchObject({ observation: 1, checkin: 1 });
  });

  it('grows through the stages to blooming, with more flowers over time', () => {
    expect(growthFrom({}).stage).toBe(0);
    expect(growthFrom({ moment: 2 }).stage).toBe(1);
    expect(growthFrom({ moment: 14 }).stage).toBe(4);
    expect(growthFrom({ moment: 14 }).flowers).toBe(1);
    expect(growthFrom({ moment: 40 }).flowers).toBeGreaterThan(3);
    expect(growthFrom({ moment: 400 }).flowers).toBe(12);
  });

  it('shows mood as weather: wind and rain on hard days, storms on rough stretches, a rainbow after', () => {
    expect(weatherFrom([], NOW)).toBe('clouds');
    expect(weatherFrom([ci('good', 0.1)], NOW)).toBe('sun');
    expect(weatherFrom([ci('wobbly', 0.1)], NOW)).toBe('breeze');
    expect(weatherFrom([ci('struggling', 0.1)], NOW)).toBe('rain');
    expect(weatherFrom([ci('struggling', 0.1), ci('struggling', 1)], NOW)).toBe('storm');
    expect(weatherFrom([ci('okay', 0.1), ci('struggling', 1)], NOW)).toBe('rainbow');
    expect(weatherFrom([ci('struggling', 5)], NOW)).toBe('clouds'); // older than three days
  });

  it('follows the seasons, or stays in spring by choice', () => {
    expect(seasonFor(new Date(2026, 0, 10), 'seasons')).toBe('winter');
    expect(seasonFor(new Date(2026, 3, 10), 'seasons')).toBe('spring');
    expect(seasonFor(new Date(2026, 6, 10), 'seasons')).toBe('summer');
    expect(seasonFor(new Date(2026, 9, 10), 'seasons')).toBe('autumn');
    expect(seasonFor(new Date(2026, 0, 10), 'spring')).toBe('spring');
  });

  it('explains growth in plain words and offers a plant for every trait', () => {
    expect(describeGrowth(growthFrom({ moment: 2, hardDay: 1 }), true)).toEqual(['2 moments while fronting', '1 hard day (rain waters the garden too)']);
    expect(new Set(PLANTS.map((p) => p.kind)).size).toBe(PLANTS.length);
    expect(suggestPlant('the host')).toBe('oak');
    expect(suggestPlant('quiet one')).toBe('moss');
  });

  it('suggests gentle ways to help it grow, linked to the rest of iDID', () => {
    const plants = buildGarden(input({ parts: [part('river'), part('ash')], entries: [entry('e1', ['river']), entry('e2', ['river'])] }));
    const base = { plants, mood: 'sun' as const, isParts: true, counts: {}, checkedInToday: false, hasOthers: true, hasSafetyPlan: true, now: NOW };
    const ideas = careIdeas(base, 12).map((i) => i.id);
    expect(ideas).toEqual(expect.arrayContaining(['checkin', 'box', 'calm', 'kind-note', 'board', 'log']));
    // The smallest plant gets a nudge of its own
    expect(careIdeas(base, 12).find((i) => i.id === 'board')?.title).toBe("Help ash's plant grow");
    // A request from someone comes first
    expect(careIdeas({ ...base, requestId: 'o1' })[0]).toMatchObject({ id: 'observe', action: { kind: 'observe', id: 'o1' } });
    // On stormy days: soothing first, no "to-do" style ideas, safety plan offered
    const storm = careIdeas({ ...base, mood: 'storm', checkedInToday: true }, 12).map((i) => i.id);
    expect(storm.slice(0, 3)).toEqual(expect.arrayContaining(['box', 'calm']));
    expect(storm).toContain('safety');
    expect(storm).not.toContain('kind-note');
    expect(storm).not.toContain('body');
    expect(careIdeas(base)).toHaveLength(3);
    // No kind note to send when nobody else is in the circle
    expect(careIdeas({ ...base, hasOthers: false }, 12).map((i) => i.id)).not.toContain('kind-note');
  });

  it('acknowledges what has already been done, counting shared care once', () => {
    const d = input({ parts: [part('a'), part('b'), part('c')], entries: [entry('e1', ['a']), entry('e2', ['b', 'c'])], activity: { id: 'sam', firsts: {}, counts: { pause: 3, 'kind-sent': 1 }, badges: {}, dismissedTips: [], lastTipAt: 0 } as never });
    expect(careSoFar(d).why).toEqual({ moment: 2, pause: 3, kind: 1 });
  });
});
