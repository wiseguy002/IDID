import { describe, expect, it } from 'vitest';
import { currentFront, frontPatterns, MAX_FRONT_MS, notesWaiting, roughDuration } from './fronting';
import type { BoardNote, FrontLog } from '../types';

const H = 3600_000;
const T0 = new Date(2026, 10, 2, 9, 0).getTime(); // a Monday, 9am local
const log = (at: number, partIds: string[], extra: Partial<FrontLog> = {}): FrontLog =>
  ({ id: `f${at}`, memberId: 'm', partIds, unknown: !partIds.length, blurry: false, note: '', at, ...extra });

describe('fronting', () => {
  it('finds the latest log for a person', () => {
    const logs = [log(T0, ['a']), log(T0 + H, ['b']), { ...log(T0 + 2 * H, ['c']), memberId: 'other' }];
    expect(currentFront(logs, 'm')?.partIds).toEqual(['b']);
    expect(currentFront([], 'm')).toBeNull();
  });

  it('adds up time in front, capping forgotten logs', () => {
    const logs = [log(T0, ['a']), log(T0 + 2 * H, ['b', 'c']), log(T0 + 3 * H, [])];
    const p = frontPatterns(logs, 'm', 30, T0 + 30 * H);
    expect(p.time.a).toBe(2 * H);
    expect(p.time.b).toBe(H);
    expect(p.time.c).toBe(H); // co-fronting counts for both
    expect(p.time['?']).toBe(MAX_FRONT_MS);
    expect(p.logs).toBe(3);
  });

  it('finds common hand-overs and usual times', () => {
    const logs: FrontLog[] = [];
    for (let d = 0; d < 3; d++) {
      logs.push(log(T0 + d * 24 * H, ['a']));          // 9am
      logs.push(log(T0 + d * 24 * H + 10 * H, ['b'])); // 7pm
    }
    const p = frontPatterns(logs, 'm', 30, T0 + 4 * 24 * H);
    expect(p.switches[0]).toEqual({ from: 'a', to: 'b', count: 3 });
    expect(p.usualTime.a).toBe('morning');
    expect(p.usualTime.b).toBe('evening');
  });

  it('ignores logs outside the window', () => {
    const p = frontPatterns([log(T0, ['a'])], 'm', 1, T0 + 40 * 24 * H);
    expect(p.logs).toBe(0);
    expect(p.time.a).toBeUndefined();
  });

  it('surfaces notes addressed to the parts now here, until they are seen or done', () => {
    const n = (id: string, to: string[], extra: Partial<BoardNote> = {}): BoardNote =>
      ({ id, memberId: 'm', fromPartId: null, toPartIds: to, text: id, pinned: false, done: false, seenBy: {}, createdAt: 1, ...extra });
    const notes = [n('forA', ['a']), n('everyone', []), n('seen', ['a'], { seenBy: { a: 5 } }), n('done', ['a'], { done: true }), n('forB', ['b'])];
    expect(notesWaiting(notes, 'm', ['a']).map((x) => x.id)).toEqual(['forA']);
    expect(notesWaiting(notes, 'm', []).length).toBe(0);
  });

  it('describes durations roughly', () => {
    expect(roughDuration(30_000)).toBe('a moment');
    expect(roughDuration(40 * 60_000)).toBe('40 minutes');
    expect(roughDuration(3 * H)).toBe('about 3 hours');
  });
});
