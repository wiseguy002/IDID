import { describe, expect, it } from 'vitest';
import { computeStats } from './stats';
import type { Entry } from '../types';

const entry = (id: string, location: string, triggers: string[]): Entry => ({
  id, subjectId: 'sam', authorId: 'sam', occurredAt: 1, loggedAt: 1, updatedAt: 1, timeApprox: false, location, triggers, mood: null, feelings: [],
  frontingPartIds: [], frontingUnknown: false, coFronting: false, coFrontPartIds: [], lostTime: false, possibleCause: '', duration: null,
  noticedByIds: [], noticedByOthers: '', intensity: null, notes: '', visibility: 'circle', followUps: [],
});

describe('Patterns with older British-spelled labels', () => {
  it('counts old and new spellings together under the US label', () => {
    const s = computeStats([entry('a', 'Shop', ['Feeling criticised']), entry('b', 'Store', ['Feeling criticized']), entry('c', 'Car / travelling', [])], [], (x) => x);
    const get = (rows: unknown, k: string) => (rows as [string, number][]).find(([n]) => n === k)?.[1];
    expect(get(s.locations, 'Store')).toBe(2);
    expect(get(s.locations, 'Car / traveling')).toBe(1);
    expect(get(s.triggers, 'Feeling criticized')).toBe(2);
    expect(get(s.locations, 'Shop')).toBeUndefined();
  });
});
