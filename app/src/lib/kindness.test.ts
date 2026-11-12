import { describe, expect, it } from 'vitest';
import { KIND_ACTS, KIND_ICONS, KIND_MESSAGES, kindActFor } from './kindness';

describe('kindness', () => {
  it('fits the server limits (message ids 0–199, known icons)', () => {
    expect(KIND_MESSAGES.length).toBeGreaterThan(10);
    expect(KIND_MESSAGES.length).toBeLessThanOrEqual(200);
    expect(KIND_ICONS.map((i) => i.id).sort()).toEqual(['flower', 'heart', 'leaf', 'sparkle', 'star', 'sun']);
    expect(new Set(KIND_MESSAGES).size).toBe(KIND_MESSAGES.length);
  });
  it('suggests one kind act per day, and a different one for "another idea"', () => {
    const d = new Date(2026, 10, 12, 9);
    expect(kindActFor(d)).toBe(kindActFor(new Date(2026, 10, 12, 22)));
    expect(kindActFor(d, 1)).not.toBe(kindActFor(d));
    expect(KIND_ACTS).toContain(kindActFor(d));
  });
});
