import { describe, expect, it } from 'vitest';
import { boxPhase, SIDES } from './BoxBreath';

describe('box breathing timing', () => {
  it('spends 4 seconds on each side: in, hold, out, hold', () => {
    expect(SIDES.map((s) => s.label)).toEqual(['Breathe in', 'Hold', 'Breathe out', 'Hold']);
    expect(boxPhase(0)).toMatchObject({ box: 0, side: 0, along: 0, count: 4 });
    expect(boxPhase(3.9)).toMatchObject({ box: 0, side: 0, count: 1 });
    expect(boxPhase(4)).toMatchObject({ box: 0, side: 1, along: 0, count: 4 });
    expect(boxPhase(9)).toMatchObject({ box: 0, side: 2, count: 3 });
    expect(boxPhase(14)).toMatchObject({ box: 0, side: 3, along: 0.5, count: 2 });
  });

  it('completes a box every 16 seconds', () => {
    expect(boxPhase(15.99).box).toBe(0);
    expect(boxPhase(16)).toMatchObject({ box: 1, side: 0, along: 0, count: 4 });
    expect(boxPhase(64).box).toBe(4);
  });

  it('never goes negative', () => {
    expect(boxPhase(-2)).toMatchObject({ box: 0, side: 0, along: 0, count: 4 });
  });
});
